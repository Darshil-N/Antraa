import sys
import io
import duckdb
import pandas as pd
import os
import json
from datetime import datetime

# Force UTF-8 output on Windows so emoji/ellipsis don't crash
if sys.platform == "win32":
    # Use line_buffering=True to ensure progress messages appear immediately
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
UPLOAD_DIR  = "uploads"
OUTPUT_FILE = "outputs/result.json"
STATUS_FILE = "outputs/status.json"

# ─────────────────────────────────────────────
# CONNECT DUCKDB (in-memory, no .db file needed)
# ─────────────────────────────────────────────
con = duckdb.connect()


class PipelineEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Timestamps, Decimals, and unserializable objects."""
    def default(self, o):
        if hasattr(o, "isoformat"):
            return o.isoformat()
        if hasattr(o, "tolist"):
            return o.tolist() # Handles numpy arrays
        if hasattr(o, "__str__"):
            return str(o)
        return super().default(o)


def write_status(state: str, message: str):
    """Write pipeline status so the frontend can poll it."""
    os.makedirs("outputs", exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        json.dump({"state": state, "message": message, "ts": datetime.now().isoformat()}, f)
    print(f"[{state.upper()}] {message}", flush=True)


def get_latest_file():
    """Find the most recently modified CSV or JSON in the uploads folder."""
    exts = [".csv", ".json"]
    files = [os.path.join(UPLOAD_DIR, f) for f in os.listdir(UPLOAD_DIR) if any(f.lower().endswith(e) for e in exts)]
    if not files:
        return None
    return max(files, key=os.path.getmtime)


def read_data_robust(filepath: str) -> pd.DataFrame:
    """
    Read CSV or JSON with DuckDB (fast). Fall back to pandas if needed.
    """
    is_json = filepath.lower().endswith(".json")

    # ── DuckDB attempt ──
    try:
        if is_json:
            df = con.execute(f"SELECT * FROM read_json_auto('{filepath}')").df()
        else:
            df = con.execute(f"""
                SELECT * FROM read_csv(
                    '{filepath}',
                    delim=',',
                    header=true,
                    quote='"',
                    escape='"',
                    null_padding=true,
                    ignore_errors=true,
                    strict_mode=false
                )
            """).df()
        print(f"[INFO] Read via DuckDB ({'JSON' if is_json else 'CSV'}) ✅")
        return df
    except Exception as duckdb_err:
        print(f"[WARN] DuckDB failed ({duckdb_err.__class__.__name__}), falling back to pandas…")

    # ── Pandas fallback ──
    if is_json:
        return pd.read_json(filepath)
    
    for enc in ["utf-8-sig", "utf-8", "latin-1", "utf-16"]:
        try:
            df = pd.read_csv(filepath, encoding=enc, on_bad_lines="skip")
            print(f"[INFO] Read via pandas (encoding={enc}) ✅")
            return df
        except Exception:
            continue

    raise RuntimeError("Could not read file with DuckDB or pandas.")


def process_data():
    write_status("running", "Scanning uploads folder...")

    # ── 1. Find the target file ──────────────────────────────────
    target_file = get_latest_file()

    if not target_file:
        write_status("error", f"No CSV or JSON files found in '{UPLOAD_DIR}'. Drop a file there first.")
        return

    write_status("running", f"Processing file: {os.path.basename(target_file)}...")

    # ── 2. Read Data ────────────────────────────────────
    try:
        df = read_data_robust(target_file)
    except Exception as e:
        write_status("error", f"Read Error: {str(e)}")
        return

    # Strip whitespace from column names if they are strings
    df.columns = [str(c).strip() for c in df.columns]

    rows, cols_count = df.shape
    if rows == 0:
        write_status("error", "File is empty — add some data rows.")
        return

    # ── 3. Schema + profiling ───────────────────────────────────
    write_status("running", "Profiling dataset metadata...")

    col_names   = list(df.columns)
    dtypes_raw  = {c: str(df[c].dtype) for c in col_names}
    missing     = {c: int(df[c].isnull().sum()) for c in col_names}
    missing_pct = {c: round(missing[c] / rows * 100, 2) for c in col_names}
    duplicates  = 0
    if rows < 50000:
        try:
            duplicates = int(df.duplicated().sum())
        except:
            pass

    unique_vals = {}
    for c in col_names:
        try:
            unique_vals[c] = int(df[c].nunique())
        except:
            # Handle nested JSON/dicts/lists which aren't hashable
            unique_vals[c] = -1 

    # Sample rows (up to 5) as list-of-dicts, safe for JSON
    sample_rows = df.head(5).where(pd.notnull(df.head(5)), None).to_dict(orient="records")

    # ── 4. Numeric statistics ───────────────────────────────────
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    
    # PERFORMANCE GATE: If too many columns, we only do full stats for the first 100
    # to avoid the UI and the process hanging.
    max_stats_cols = 100
    cols_to_process = numeric_cols[:max_stats_cols]
    
    stats = {}
    for i, col in enumerate(cols_to_process):
        if i % 20 == 0:
            write_status("running", f"Computing numeric stats ({i}/{len(cols_to_process)} columns)...")
            
        series = df[col].dropna()
        if series.empty:
            continue
        try:
            q1  = float(series.quantile(0.25))
            q3  = float(series.quantile(0.75))
            iqr = q3 - q1
            outliers = int(((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum())
            stats[col] = {
                "mean":     round(float(series.mean()), 4),
                "median":   round(float(series.median()), 4),
                "std":      round(float(series.std()), 4),
                "min":      round(float(series.min()), 4),
                "max":      round(float(series.max()), 4),
                "q1":       round(q1, 4),
                "q3":       round(q3, 4),
                "iqr":      round(iqr, 4),
                "outliers": outliers,
            }
        except:
            continue

    # ── 5. Categorical columns ──────────────────────────────────
    cat_cols   = df.select_dtypes(include=["object", "category"]).columns.tolist()
    categories = {}
    for col in cat_cols:
        top = df[col].value_counts().head(10).to_dict()
        categories[col] = {str(k): int(v) for k, v in top.items()}

    # ── 6. Correlation matrix ───────────────────────────────────
    # PERFORMANCE GATE: Skip correlation if > 50 columns to avoid O(N^2) hang
    corr = {}
    if 1 < len(numeric_cols) <= 50:
        write_status("running", "Computing correlation matrix...")
        corr = df[numeric_cols].corr().round(4).to_dict()
    elif len(numeric_cols) > 50:
        print("[INFO] Skipping correlation matrix: too many columns (>50)")

    # ── 7. Data quality score ───────────────────────────────────
    total_cells    = rows * cols_count
    missing_total  = sum(missing.values())
    completeness   = 1 - (missing_total / total_cells) if total_cells > 0 else 1
    quality_score  = round(completeness * 100, 1)

    # ── 8. AI-ready schema description ─────────────────────────
    #    This block is specifically designed to be sent to an LLM.
    ai_schema = {
        "description": f"Dataset with {rows} rows and {cols_count} columns.",
        "columns": [
            {
                "name":         col,
                "dtype":        dtypes_raw[col],
                "role":         "numeric" if col in numeric_cols else "categorical" if col in cat_cols else "other",
                "unique_values": unique_vals[col],
                "missing_count": missing[col],
                "missing_pct":  missing_pct[col],
                "stats":        stats.get(col),       # None for non-numeric
                "top_values":   categories.get(col),  # None for non-categorical
            }
            for col in col_names
        ],
        "sample_rows":    sample_rows,
        "quality_score":  quality_score,
        "suggested_tasks": _suggest_tasks(numeric_cols, cat_cols, rows),
    }

    # ── 9. Final output ─────────────────────────────────────────
    result = {
        # ── for the UI ──
        "meta": {
            "processed_at":  datetime.now().isoformat(),
            "source_file":   os.path.basename(target_file),
            "rows":          rows,
            "columns":       cols_count,
            "column_names":  col_names,
            "dtypes":        dtypes_raw,
            "duplicates":    duplicates,
            "quality_score": quality_score,
        },
        "missing_values":  missing,
        "missing_percent": missing_pct,
        "numeric_stats":   stats,
        "categorical_top": categories,
        "correlation":     corr,
        # ── for AI ──
        "ai_ready": ai_schema,
    }

    os.makedirs("outputs", exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False, cls=PipelineEncoder)

    write_status(
        "done",
        f"Done! {rows} rows × {cols_count} cols · Quality: {quality_score}% · "
        f"{len(numeric_cols)} numeric, {len(cat_cols)} categorical columns"
    )
    print(f"\n[OK] Output -> {OUTPUT_FILE}")
    print("[OK] AI schema -> result['ai_ready']  (send this section to your LLM)")


def _suggest_tasks(numeric_cols, cat_cols, rows):
    """Generate simple AI task suggestions based on dataset shape."""
    tasks = []
    if numeric_cols:
        tasks.append("Predict a numeric target using regression")
        tasks.append("Detect anomalies / outliers in numeric columns")
    if cat_cols:
        tasks.append("Classify records by a categorical column")
        tasks.append("Group and summarize by category")
    if rows > 1000:
        tasks.append("Train a machine learning model (sufficient data)")
    else:
        tasks.append("Use statistical analysis (small dataset — ML may overfit)")
    return tasks


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    process_data()
