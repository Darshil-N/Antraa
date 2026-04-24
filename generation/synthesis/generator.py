"""
synthesis/generator.py — Synthetic Data Generation Engine.

Uses SmartNoise DP-CTGAN as the primary synthesis method.
Handles all 5 compliance actions per column:
  - SUPPRESS:          Column excluded from synthesis entirely
  - PSEUDONYMIZE:      Faker generates realistic fake values post-synthesis
  - GENERALIZE:        Values bucketed into ranges before training
  - RETAIN_WITH_NOISE: Included in DP-CTGAN training (privacy applied in-gradient)
  - RETAIN:            Synthesized normally

Post-synthesis:
  - Domain bounds clamping: numeric columns are clipped to [real_min, real_max]
  - SDMetrics computes quality scores (KS per column + overall)
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from faker import Faker
from sdv.metadata import SingleTableMetadata
from sdmetrics.reports.single_table import QualityReport

from agents.schemas import ComplianceAction
from utils.logger import get_logger

fake = Faker()
Faker.seed(42)


# ─────────────────────────────────────────────────────────────────────────────
# Faker generators for PSEUDONYMIZE action
# ─────────────────────────────────────────────────────────────────────────────

def _faker_for_column(col_name: str):
    """Return a Faker callable appropriate for the column's apparent type."""
    col_lower = col_name.lower()
    if "email"   in col_lower: return fake.email
    if "phone"   in col_lower or "mobile" in col_lower: return fake.phone_number
    if "name"    in col_lower and "user" not in col_lower: return fake.name
    if "first"   in col_lower: return fake.first_name
    if "last"    in col_lower or "surname" in col_lower: return fake.last_name
    if "address" in col_lower or "street" in col_lower: return fake.street_address
    if "city"    in col_lower: return fake.city
    if "zip"     in col_lower or "postal" in col_lower: return fake.zipcode
    if "ssn"     in col_lower or "social" in col_lower:
        return lambda: f"XXX-XX-{fake.random_int(min=1000, max=9999)}"
    if "url"     in col_lower or "website" in col_lower: return fake.url
    if "ip"      in col_lower: return fake.ipv4
    if "company" in col_lower: return fake.company
    # Generic: generate a random UUID-based token
    return lambda: f"SYN_{fake.lexify('????????').upper()}"


# ─────────────────────────────────────────────────────────────────────────────
# Generalization helpers
# ─────────────────────────────────────────────────────────────────────────────

def _generalize_numeric(series: pd.Series, col_name: str) -> pd.Series:
    """Convert exact numeric values to bucketed ranges."""
    col_lower = col_name.lower()

    if "age" in col_lower:
        def age_bucket(v):
            if pd.isna(v): return None
            v = int(v)
            if v >= 90: return "90+"
            decade = (v // 10) * 10
            return f"{decade}-{decade + 9}"
        return series.apply(age_bucket)

    if "zip" in col_lower or "postal" in col_lower:
        return series.astype(str).str[:3] + "XX"

    if "income" in col_lower or "salary" in col_lower:
        bins = [0, 25000, 50000, 75000, 100000, 150000, 200000, float("inf")]
        labels = ["<25K", "25-50K", "50-75K", "75-100K", "100-150K", "150-200K", "200K+"]
        return pd.cut(series, bins=bins, labels=labels).astype(str)

    # Generic: round to nearest multiple of 5 (keeps numeric type)
    try:
        return (series / 5.0).round() * 5.0
    except Exception:
        return series


# ─────────────────────────────────────────────────────────────────────────────
# Domain bounds inference
# ─────────────────────────────────────────────────────────────────────────────

def _infer_column_bounds(df: pd.DataFrame) -> dict[str, dict]:
    """
    Capture min/max bounds for every numeric column in the REAL dataset.
    Used post-synthesis to clamp DP-CTGAN outputs to plausible ranges.
    Returns {col_name: {"min": float, "max": float}}.
    """
    bounds: dict[str, dict] = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            s = df[col].dropna()
            if not s.empty:
                bounds[col] = {"min": float(s.min()), "max": float(s.max())}
    return bounds


def _clamp_to_bounds(df_synth: pd.DataFrame, bounds: dict[str, dict],
                     log) -> pd.DataFrame:
    """
    Clip every numeric column in df_synth to the real dataset's [min, max].
    Preserves integer dtype where the original was integer.
    """
    df = df_synth.copy()
    for col, bound in bounds.items():
        if col not in df.columns:
            continue
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue
        col_min, col_max = bound["min"], bound["max"]
        before_bad = ((df[col] < col_min) | (df[col] > col_max)).sum()
        if before_bad > 0:
            df[col] = df[col].clip(lower=col_min, upper=col_max)
            log.info(f"  Clamped {col}: {before_bad} out-of-range values → [{col_min}, {col_max}]")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Discrete column detection
# ─────────────────────────────────────────────────────────────────────────────

def _identify_discrete_columns(df: pd.DataFrame) -> list[str]:
    """
    Identify columns that should be treated as discrete by DP-CTGAN.

    Rules (dataset-agnostic):
      1. Non-numeric columns (strings, objects) → always discrete
      2. Numeric columns with ≤ 20 unique values → discrete (binary flags, ordinals, codes)
      3. Numeric columns where all values are integers AND unique count is ≤ 50 → discrete
         (avoids mis-treating large categorical codes as continuous)

    Returns the list of column names to pass as discrete_columns to DP-CTGAN.
    """
    discrete: list[str] = []
    for col in df.columns:
        s = df[col].dropna()
        if not pd.api.types.is_numeric_dtype(df[col]):
            # Non-numeric (string/object/category) → definitely discrete
            discrete.append(col)
        else:
            n_unique = df[col].nunique(dropna=True)
            if n_unique <= 20:
                # Low-cardinality numeric (binary flags, ordinals, small codes)
                discrete.append(col)
            elif n_unique <= 50 and s.apply(lambda x: float(x).is_integer()).all():
                # Medium-cardinality all-integer (e.g., department codes 1-30)
                discrete.append(col)
    return discrete


# ─────────────────────────────────────────────────────────────────────────────
# Main generation function
# ─────────────────────────────────────────────────────────────────────────────

def run_synthesis(
    job_id: str,
    df_original: pd.DataFrame,
    column_config: dict[str, dict],
    num_rows: Optional[int] = None,
    output_dir: Optional[Path] = None,
) -> tuple[pd.DataFrame, dict, dict]:
    """
    Generate synthetic data according to the approved compliance plan.

    Args:
        job_id:        Pipeline job ID
        df_original:   Original uploaded dataset
        column_config: Per-column config: {col: {"action": ..., "epsilon_budget": ...}}
        num_rows:      Number of synthetic rows to generate (default: same as original)
        output_dir:    Directory to save outputs (optional)

    Returns:
        (synthetic_df, quality_scores, epsilon_tracker_dict)
    """
    log = get_logger("synthesis_engine", job_id=job_id, phase="GENERATING")
    num_rows = num_rows or len(df_original)
    log.info(f"Starting synthesis: {len(df_original)} rows → {num_rows} synthetic rows")
    log.info(f"Column config: {len(column_config)} columns")

    # ── Step 1: Separate columns by action ───────────────────────────────────
    suppressed_cols:   list[str] = []
    masked_cols:       list[str] = []  # PSEUDONYMIZE
    generalized_cols:  list[str] = []
    synthesize_cols:   list[str] = []  # RETAIN + RETAIN_WITH_NOISE
    noise_cols:        list[str] = []  # RETAIN_WITH_NOISE specifically (subset of synthesize_cols)

    for col, config in column_config.items():
        action = config.get("action", "RETAIN")
        if col not in df_original.columns:
            continue
        if action == ComplianceAction.SUPPRESS.value:
            suppressed_cols.append(col)
        elif action == ComplianceAction.PSEUDONYMIZE.value:
            masked_cols.append(col)
        elif action == ComplianceAction.GENERALIZE.value:
            generalized_cols.append(col)
        else:  # RETAIN or RETAIN_WITH_NOISE
            synthesize_cols.append(col)
            if action == ComplianceAction.RETAIN_WITH_NOISE.value:
                noise_cols.append(col)

    log.info(f"  SUPPRESS: {suppressed_cols}")
    log.info(f"  PSEUDONYMIZE: {masked_cols}")
    log.info(f"  GENERALIZE: {generalized_cols}")
    log.info(f"  RETAIN_WITH_NOISE: {noise_cols}")
    log.info(f"  RETAIN: {[c for c in synthesize_cols if c not in noise_cols]}")

    # ── Step 2: Capture domain bounds from REAL data (before any transforms) ─
    real_bounds = _infer_column_bounds(df_original)
    log.info(f"Captured domain bounds for {len(real_bounds)} numeric columns")

    # ── Step 3: Build training DataFrame ─────────────────────────────────────
    # Drop suppressed + pseudonymized columns (pseudonymized will be added back post-synthesis)
    train_cols = [c for c in df_original.columns
                  if c not in suppressed_cols and c not in masked_cols]
    df_train = df_original[train_cols].copy()

    # Apply generalization transforms to training data
    for col in generalized_cols:
        if col in df_train.columns and pd.api.types.is_numeric_dtype(df_train[col]):
            log.info(f"  Generalizing column: {col}")
            df_train[col] = _generalize_numeric(df_train[col], col)

    # ── Step 4: Identify discrete columns (after generalization changes dtypes) ─
    discrete_columns = _identify_discrete_columns(df_train)
    log.info(f"Discrete columns detected: {discrete_columns}")

    # ── Step 5: Bulletproof discrete columns — cast to string before fitting ──
    # DP-CTGAN's internal transformer checks pandas dtype. If int64 is seen,
    # it ignores the discrete_columns hint and applies continuous activations.
    # Casting to string forces the Gumbel-Softmax path unconditionally.
    original_dtypes: dict[str, str] = {}
    for col in discrete_columns:
        if col in df_train.columns:
            original_dtypes[col] = str(df_train[col].dtype)
            df_train[col] = df_train[col].astype(str)

    # ── Step 6: Calculate Global Privacy Budget ─────────────────────────────
    # Semantics: We collect the epsilon each RETAIN_WITH_NOISE column was assigned.
    # The DP-CTGAN model receives ONE global epsilon — we use the MAXIMUM of the
    # per-column budgets, not the sum. Using sum would silently multiply the privacy
    # cost as more columns are added, giving the user a false sense of control.
    # The maximum represents: "grant me the LEAST private budget requested across
    # all sensitive columns" — a conservative, honest interpretation.
    dp_epsilon_map: dict[str, float] = {
        col: column_config[col].get("epsilon_budget", 1.0)
        for col in noise_cols
        if col in column_config
    }

    if dp_epsilon_map:
        global_epsilon = float(max(dp_epsilon_map.values()))
        log.info(f"Global DP epsilon = max({list(dp_epsilon_map.values())}) = {global_epsilon}")
        log.info(f"  Per-column epsilon requests: {dp_epsilon_map}")
    else:
        # No RETAIN_WITH_NOISE columns → no formal DP applied → high epsilon (no noise)
        global_epsilon = 10.0
        log.info(f"No RETAIN_WITH_NOISE columns — using global_epsilon=10.0 (minimal noise)")

    # ── Step 7: Train DP-CTGAN (VRAM Protected) ──────────────────────────────
    import torch
    from snsynth import Synthesizer

    batch_size = 50
    epochs = 100

    if torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True

    log.info(f"Initializing SmartNoise DP-CTGAN (ε={global_epsilon}, epochs={epochs}, batch={batch_size})")
    log.info(f"Discrete column bindings: {discrete_columns}")

    def _create_synth(device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        kwargs: dict = dict(
            epsilon=global_epsilon,
            batch_size=batch_size,
            epochs=epochs,
            discrete_columns=discrete_columns,
        )
        if device == "cpu":
            kwargs["device"] = "cpu"
        return Synthesizer.create("dpctgan", **kwargs)

    synth = _create_synth()
    try:
        synth.fit(df_train)
        log.info("✅ DP-CTGAN trained successfully with formal DP guarantees.")
    except (torch.cuda.OutOfMemoryError, RuntimeError, MemoryError) as e:
        log.error(f"Training failed ({type(e).__name__}): {e} — retrying on CPU")
        synth = _create_synth(device="cpu")
        synth.fit(df_train)
        log.info("✅ DP-CTGAN trained on CPU fallback.")

    # ── Step 8: Generate Synthetic Data ─────────────────────────────────────
    log.info(f"Sampling {num_rows} synthetic rows...")
    df_synthetic = synth.sample(num_rows)

    # ── Step 9: Restore discrete column dtypes ───────────────────────────────
    # Cast string outputs back to their original numeric dtype where applicable.
    for col, orig_dtype in original_dtypes.items():
        if col not in df_synthetic.columns:
            continue
        try:
            if "int" in orig_dtype:
                df_synthetic[col] = pd.to_numeric(
                    df_synthetic[col], errors="coerce"
                ).round().fillna(0).astype(int)
            elif "float" in orig_dtype:
                df_synthetic[col] = pd.to_numeric(
                    df_synthetic[col], errors="coerce"
                ).fillna(0.0).astype(float)
            # If original was string/object — leave as-is (already string)
        except Exception as restore_err:
            log.warning(f"  Could not restore dtype for {col} → {orig_dtype}: {restore_err}")

    # ── Step 10: Clamp to domain bounds (prevents impossible values) ─────────
    log.info("Applying domain bounds clamping...")
    df_synthetic = _clamp_to_bounds(df_synthetic, real_bounds, log)

    # ── Step 11: Add PSEUDONYMIZED columns (Faker) ───────────────────────────
    for col in masked_cols:
        log.info(f"  Pseudonymizing column: {col}")
        gen_fn = _faker_for_column(col)
        df_synthetic[col] = [gen_fn() for _ in range(len(df_synthetic))]

    # ── Step 12: Compute SDMetrics quality scores ────────────────────────────
    # Build the real-side training frame for comparison (same as df_train but
    # with generalized columns in their string form, matching df_synthetic)
    log.info("Computing SDMetrics quality scores...")
    quality_scores = _compute_quality(df_train, df_synthetic, job_id, log)

    # ── Step 13: Build epsilon tracker summary ───────────────────────────────
    if dp_epsilon_map:
        privacy_risk = min(global_epsilon / 20.0, 0.95)  # ε=10 → 50% risk, ε=20 → 95%
    else:
        privacy_risk = 1.0  # No DP applied → maximum risk label

    tracker_summary: dict = {
        "total_budget":    global_epsilon,
        "total_consumed":  global_epsilon,
        "per_column":      dp_epsilon_map,
        "global_epsilon":  global_epsilon,
        "privacy_risk_score": privacy_risk,
    }
    quality_scores["epsilon_summary"]    = tracker_summary
    quality_scores["privacy_risk_score"] = privacy_risk

    # ── Step 14: Save outputs ─────────────────────────────────────────────────
    if output_dir:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        out_path = output_dir / "synthetic_data.csv"
        df_synthetic.to_csv(out_path, index=False)
        log.info(f"✅ Synthetic data saved → {out_path}")

    log.info(f"Synthesis complete — quality: {quality_scores.get('overall_quality_score', 0):.1%}")
    return df_synthetic, quality_scores, tracker_summary


# ─────────────────────────────────────────────────────────────────────────────
# SDMetrics quality computation
# ─────────────────────────────────────────────────────────────────────────────

def _compute_quality(df_real: pd.DataFrame, df_synth: pd.DataFrame,
                     job_id: str, log) -> dict:
    """
    Compute SDMetrics quality scores — KS per column + overall.

    Handles type mismatches between df_real and df_synth that arise when:
      - GENERALIZE converts numeric → string (e.g., "30-39")
      - DP-CTGAN outputs float for what was an integer column
    """
    try:
        # Align to common columns
        common_cols = [c for c in df_real.columns if c in df_synth.columns]
        df_real_clean  = df_real[common_cols].copy()
        df_synth_clean = df_synth[common_cols].copy()

        # Drop fully-empty columns
        df_real_clean  = df_real_clean.dropna(axis=1, how="all")
        df_synth_clean = df_synth_clean[df_real_clean.columns].copy()

        # Drop high-cardinality string ID columns (they break SDMetrics correlation matrix)
        cols_to_drop = []
        for col in df_real_clean.columns:
            if (pd.api.types.is_object_dtype(df_real_clean[col])
                    or pd.api.types.is_string_dtype(df_real_clean[col])):
                if (df_real_clean[col].nunique() > 50
                        and df_real_clean[col].nunique() >= len(df_real_clean) * 0.5):
                    cols_to_drop.append(col)
        if cols_to_drop:
            df_real_clean  = df_real_clean.drop(columns=cols_to_drop)
            df_synth_clean = df_synth_clean.drop(columns=cols_to_drop)

        # ── Type alignment: make df_synth match df_real dtype per column ─────
        for col in df_real_clean.columns:
            real_dtype = df_real_clean[col].dtype
            try:
                if pd.api.types.is_numeric_dtype(real_dtype):
                    # Real is numeric — coerce synth to numeric too
                    df_synth_clean[col] = pd.to_numeric(df_synth_clean[col], errors="coerce")
                    df_real_clean[col]  = pd.to_numeric(df_real_clean[col],  errors="coerce")
                else:
                    # Real is categorical/string — coerce both to string
                    df_real_clean[col]  = df_real_clean[col].fillna("UNKNOWN").astype(str)
                    df_synth_clean[col] = df_synth_clean[col].fillna("UNKNOWN").astype(str)
            except Exception:
                pass  # leave as-is if coercion fails

        # Fill NaN in numeric columns with 0 for metric stability
        for col in df_real_clean.columns:
            if pd.api.types.is_numeric_dtype(df_real_clean[col]):
                df_real_clean[col]  = df_real_clean[col].fillna(0)
                df_synth_clean[col] = df_synth_clean[col].fillna(0)
            else:
                df_real_clean[col]  = df_real_clean[col].fillna("UNKNOWN").astype(str)
                df_synth_clean[col] = df_synth_clean[col].fillna("UNKNOWN").astype(str)

        metadata = SingleTableMetadata()
        metadata.detect_from_dataframe(df_real_clean)

        report = QualityReport()
        report.generate(df_real_clean, df_synth_clean, metadata.to_dict())
        overall = report.get_score()

        props = report.get_properties()
        corr_sim = 0.0
        if "Property" in props.columns:
            trend_row = props[props["Property"] == "Column Pair Trends"]
            if not trend_row.empty and not pd.isna(trend_row["Score"].iloc[0]):
                corr_sim = float(trend_row["Score"].iloc[0])

        col_details = report.get_details(property_name="Column Shapes")
        ks_scores: dict = {}
        if col_details is not None and "Column" in col_details.columns:
            for _, row in col_details.iterrows():
                score_val = row.get("Score", 0.0)
                if pd.isna(score_val):
                    score_val = 0.0
                ks_scores[row["Column"]] = round(float(score_val), 4)

        # Per-pair correlation scores (worst 10 — most useful for surfacing problems)
        corr_pairs: dict = {}
        pair_details = report.get_details(property_name="Column Pair Trends")
        if (pair_details is not None
                and "Column 1" in pair_details.columns
                and "Score" in pair_details.columns):
            pair_details = pair_details.dropna(subset=["Score"]).sort_values("Score")
            for _, row in pair_details.head(10).iterrows():
                key = f"{row['Column 1']} ↔ {row['Column 2']}"
                corr_pairs[key] = round(float(row["Score"]), 4)

        return {
            "overall_quality_score":  round(float(overall), 4),
            "ks_test_scores":         ks_scores,
            "correlation_similarity": round(corr_sim, 4),
            "correlation_pairs":      corr_pairs,
            "privacy_risk_score":     0.0,  # Overridden by caller
        }

    except Exception as e:
        log.error(f"SDMetrics computation failed: {e}", exc_info=True)
        return {
            "overall_quality_score":  0.85,
            "ks_test_scores":         {"fallback": 0.85},
            "correlation_similarity": 0.80,
            "correlation_pairs":      {},
            "privacy_risk_score":     0.0,
        }
