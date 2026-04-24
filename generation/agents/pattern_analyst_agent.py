"""
agents/pattern_analyst_agent.py — Statistical Pattern Analysis Agent.

DESIGN PRINCIPLE — Independence From Synthesis Pipeline:
This agent is intentionally decoupled from the synthesis process.
It accepts a raw DataFrame and a BLIND label (the LLM never knows
whether this is the "original" or "synthetic" dataset).

This prevents hallucination: if the agent knew it was analyzing the
synthetic output, the LLM might generate overly optimistic narratives
based on what it "knows" was preserved. By keeping it blind, the
statistical narrative is based purely on the numbers.

Outputs:
  - PatternReport: human-readable statistical narrative + computed stats
  - PatternComparisonReport: side-by-side comparison of two PatternReports
"""

from __future__ import annotations

import json
import re
from typing import Optional

import numpy as np
import pandas as pd
import ollama

from config import settings
from utils.logger import get_logger


# ─────────────────────────────────────────────────────────────────────────────
# Statistical fingerprint computation (pure, no LLM)
# ─────────────────────────────────────────────────────────────────────────────

def _compute_fingerprint(df: pd.DataFrame) -> dict:
    """
    Compute a comprehensive statistical fingerprint from a DataFrame.
    Returns pure numbers — no interpretation, no LLM calls.
    This is what gets passed to the LLM for narrative generation.
    """
    n_rows, n_cols = df.shape
    fingerprint: dict = {
        "shape": {"rows": n_rows, "columns": n_cols},
        "numeric_stats": {},
        "categorical_stats": {},
        "missing_rates": {},
        "correlation_matrix": {},
        "outlier_counts": {},
    }

    # Missing rates
    for col in df.columns:
        rate = round(df[col].isnull().mean() * 100, 2)
        fingerprint["missing_rates"][col] = rate

    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    cat_cols     = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()

    # Numeric statistics
    for col in numeric_cols:
        s = df[col].dropna()
        if s.empty:
            continue
        q1 = float(s.quantile(0.25))
        q3 = float(s.quantile(0.75))
        iqr = q3 - q1
        outlier_count = int(((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).sum())
        fingerprint["numeric_stats"][col] = {
            "mean":    round(float(s.mean()), 4),
            "median":  round(float(s.median()), 4),
            "std":     round(float(s.std(ddof=0)), 4),
            "min":     round(float(s.min()), 4),
            "max":     round(float(s.max()), 4),
            "q1":      round(q1, 4),
            "q3":      round(q3, 4),
            "iqr":     round(iqr, 4),
            "skewness": round(float(s.skew()), 4),
        }
        fingerprint["outlier_counts"][col] = outlier_count

    # Categorical statistics
    for col in cat_cols:
        vc = df[col].dropna().astype(str).value_counts(normalize=True)
        top5 = {k: round(float(v), 4) for k, v in vc.head(5).items()}
        fingerprint["categorical_stats"][col] = {
            "unique_count": int(df[col].nunique()),
            "top_values":   top5,
            "entropy":      round(float(_entropy(vc.values)), 4),
        }

    # Correlation matrix (numeric only, up to 20 columns to keep JSON manageable)
    if len(numeric_cols) > 1:
        corr = df[numeric_cols[:20]].corr().round(3).fillna(0)
        fingerprint["correlation_matrix"] = corr.to_dict()

    return fingerprint


def _entropy(probs: np.ndarray) -> float:
    """Shannon entropy of a probability distribution."""
    probs = probs[probs > 0]
    return float(-np.sum(probs * np.log2(probs)))


# ─────────────────────────────────────────────────────────────────────────────
# LLM narrative generation (blind to dataset identity)
# ─────────────────────────────────────────────────────────────────────────────

_ANALYST_SYSTEM = """You are a data scientist writing a statistical pattern report.
You will receive a JSON object containing statistical measurements of an anonymous dataset.
Your job is to write a clear, factual, human-readable pattern summary.

Do NOT speculate about how the data was generated. Do NOT use words like "synthetic",
"original", "real", "fake", "generated", or "model". You are only describing
statistical patterns you observe in the numbers.

Focus on:
1. Distribution shapes (normal, skewed, bimodal) for numeric columns
2. Central tendency (mean/median gaps indicating skew)
3. Category proportions and dominant values
4. Outlier patterns
5. Key inter-variable correlations (strongest positive and negative)
6. Overall data quality (missing rates)

Write in professional language. Be specific and cite the numbers.
Return a JSON object with keys:
{
  "overall_summary": "<2-3 sentence overview of the dataset>",
  "numeric_patterns": {"<col>": "<1 sentence description>", ...},
  "categorical_patterns": {"<col>": "<1 sentence description>", ...},
  "correlation_highlights": "<description of top 3 correlations>",
  "data_quality_notes": "<description of missing values or anomalies>"
}"""


def _call_analyst_llm(fingerprint: dict, job_id: str) -> Optional[dict]:
    """
    Send the statistical fingerprint to the LLM for narrative generation.
    The LLM never receives any label about dataset identity.
    """
    log = get_logger("pattern_analyst", job_id=job_id)
    # Trim fingerprint to avoid exceeding context window
    payload = {
        "shape":              fingerprint["shape"],
        "numeric_stats":      fingerprint["numeric_stats"],
        "categorical_stats":  fingerprint["categorical_stats"],
        "missing_rates":      fingerprint["missing_rates"],
        "outlier_counts":     fingerprint["outlier_counts"],
        # Only top-10 correlation pairs to keep payload manageable
        "top_correlations":   _top_correlations(fingerprint.get("correlation_matrix", {})),
    }

    try:
        client = ollama.Client(host=settings.ollama_base_url)
        response = client.chat(
            model=settings.primary_model,
            messages=[
                {"role": "system", "content": _ANALYST_SYSTEM},
                {"role": "user",   "content": (
                    "Here are the statistical measurements of an anonymous dataset. "
                    "Write the pattern report:\n\n"
                    + json.dumps(payload, indent=2)
                )},
            ],
            format="json",
            options={"temperature": 0.1, "num_ctx": 6000},
        )
        raw = response["message"]["content"]
        # Strip markdown fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        log.error(f"Pattern analyst LLM call failed: {e}")
        return None


def _top_correlations(corr_matrix: dict, top_n: int = 10) -> list[dict]:
    """Extract top-N strongest correlations (absolute value) from a correlation dict."""
    pairs = []
    cols = list(corr_matrix.keys())
    for i, c1 in enumerate(cols):
        for c2 in cols[i + 1:]:
            val = corr_matrix.get(c1, {}).get(c2)
            if val is not None and not np.isnan(val):
                pairs.append({"col1": c1, "col2": c2, "correlation": round(float(val), 3)})
    pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return pairs[:top_n]


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def analyze_dataset_pattern(
    df: pd.DataFrame,
    job_id: str,
    dataset_label: str = "DATASET",  # Only used in log messages, NOT passed to LLM
) -> dict:
    """
    Analyze a dataset and return a statistical pattern report.

    Args:
        df:            The DataFrame to analyze (original OR synthetic)
        job_id:        Job ID for logging
        dataset_label: Human-readable label for log messages only ("ORIGINAL" / "SYNTHETIC")
                       This is NEVER passed to the LLM to prevent bias.

    Returns:
        dict with keys: fingerprint, narrative, shape
    """
    log = get_logger("pattern_analyst", job_id=job_id, phase="ANALYSIS")
    log.info(f"Computing statistical fingerprint for {dataset_label} dataset ({df.shape})...")

    fingerprint = _compute_fingerprint(df)
    log.info(f"  Numeric columns analysed: {len(fingerprint['numeric_stats'])}")
    log.info(f"  Categorical columns analysed: {len(fingerprint['categorical_stats'])}")

    log.info("Calling LLM for blind pattern narrative (LLM has no knowledge of dataset identity)...")
    narrative = _call_analyst_llm(fingerprint, job_id)

    if not narrative:
        # Fallback: generate a simple programmatic narrative
        narrative = _fallback_narrative(fingerprint)
        log.warning("LLM narrative failed — using programmatic fallback")

    log.info(f"Pattern analysis complete for {dataset_label}")
    return {
        "dataset_label": dataset_label,
        "fingerprint":   fingerprint,
        "narrative":     narrative,
    }


def compare_patterns(
    original_report: dict,
    synthetic_report: dict,
    job_id: str,
) -> dict:
    """
    Compare two pattern reports and generate a preservation score + narrative.

    The comparison is done mathematically (no LLM for the score computation),
    then the LLM writes the final comparison narrative.

    Returns dict with:
      - preservation_score: float 0-1 (1 = perfect preservation)
      - per_column_drift: dict of absolute drift per column
      - comparison_narrative: LLM-written comparison text
      - verdict: "STRONG" / "MODERATE" / "WEAK"
    """
    log = get_logger("pattern_comparison", job_id=job_id, phase="COMPARISON")
    log.info("Computing pattern comparison between ORIGINAL and SYNTHETIC...")

    orig_fp = original_report["fingerprint"]
    synth_fp = synthetic_report["fingerprint"]

    # ── Compute numeric drift ─────────────────────────────────────────────────
    numeric_drift: dict = {}
    drift_scores: list[float] = []

    for col, orig_stats in orig_fp["numeric_stats"].items():
        if col not in synth_fp["numeric_stats"]:
            continue
        synth_stats = synth_fp["numeric_stats"][col]

        orig_range = orig_stats["max"] - orig_stats["min"]
        if orig_range == 0:
            continue

        mean_drift   = abs(orig_stats["mean"]   - synth_stats["mean"])   / max(abs(orig_stats["mean"]),   1e-9)
        median_drift = abs(orig_stats["median"] - synth_stats["median"]) / max(abs(orig_stats["median"]), 1e-9)
        std_drift    = abs(orig_stats["std"]    - synth_stats["std"])    / max(abs(orig_stats["std"]),    1e-9)

        col_score = max(0.0, 1.0 - (mean_drift + median_drift + std_drift) / 3)
        numeric_drift[col] = {
            "mean_drift_pct":   round(mean_drift   * 100, 2),
            "median_drift_pct": round(median_drift * 100, 2),
            "std_drift_pct":    round(std_drift    * 100, 2),
            "preservation_score": round(col_score, 4),
        }
        drift_scores.append(col_score)

    # ── Compute categorical overlap ───────────────────────────────────────────
    categorical_overlap: dict = {}
    for col, orig_stats in orig_fp["categorical_stats"].items():
        if col not in synth_fp["categorical_stats"]:
            continue
        synth_stats = synth_fp["categorical_stats"][col]

        orig_top  = set(orig_stats["top_values"].keys())
        synth_top = set(synth_stats["top_values"].keys())
        overlap   = len(orig_top & synth_top) / max(len(orig_top), 1)

        categorical_overlap[col] = {
            "top_value_overlap_pct": round(overlap * 100, 1),
            "orig_unique":           orig_stats["unique_count"],
            "synth_unique":          synth_stats["unique_count"],
            "preservation_score":    round(overlap, 4),
        }
        drift_scores.append(overlap)

    # ── Overall preservation score ────────────────────────────────────────────
    preservation_score = round(float(np.mean(drift_scores)) if drift_scores else 0.0, 4)
    if preservation_score >= 0.85:
        verdict = "STRONG"
    elif preservation_score >= 0.65:
        verdict = "MODERATE"
    else:
        verdict = "WEAK"

    log.info(f"Preservation score: {preservation_score:.1%} ({verdict})")

    # ── LLM comparison narrative ──────────────────────────────────────────────
    comparison_narrative = _call_comparison_llm(
        orig_fp, synth_fp, numeric_drift, categorical_overlap,
        preservation_score, job_id
    )

    return {
        "preservation_score":   preservation_score,
        "verdict":              verdict,
        "numeric_drift":        numeric_drift,
        "categorical_overlap":  categorical_overlap,
        "original_narrative":   original_report["narrative"],
        "synthetic_narrative":  synthetic_report["narrative"],
        "comparison_narrative": comparison_narrative,
    }


_COMPARISON_SYSTEM = """You are a data quality auditor comparing two anonymous statistical reports.
You will receive statistics from Report A and Report B (you don't know which is "original" or "synthetic").
Write a factual, professional comparison for a compliance auditor.

Focus on:
1. What statistical patterns are preserved between the two reports
2. What has drifted and by how much (cite actual numbers)
3. Whether the overall dataset structure (shape, distributions, correlations) is maintained
4. Whether categorical value proportions are realistic

Use professional language. Be precise. Mention specific columns with specific numbers.
Return JSON:
{
  "headline": "<One sentence verdict>",
  "preserved_patterns": ["<specific pattern 1>", "..."],
  "drifted_patterns": ["<specific drift 1>", "..."],
  "auditor_conclusion": "<2-3 sentences for a compliance certificate>"
}"""


def _call_comparison_llm(
    orig_fp: dict, synth_fp: dict,
    numeric_drift: dict, categorical_overlap: dict,
    preservation_score: float, job_id: str,
) -> dict:
    log = get_logger("pattern_comparison", job_id=job_id)
    payload = {
        "overall_preservation_score": preservation_score,
        "numeric_drift_summary":      numeric_drift,
        "categorical_overlap_summary": categorical_overlap,
        "report_a_numeric":           orig_fp["numeric_stats"],
        "report_b_numeric":           synth_fp["numeric_stats"],
        "report_a_categorical":       orig_fp["categorical_stats"],
        "report_b_categorical":       synth_fp["categorical_stats"],
    }
    try:
        client = ollama.Client(host=settings.ollama_base_url)
        response = client.chat(
            model=settings.primary_model,
            messages=[
                {"role": "system", "content": _COMPARISON_SYSTEM},
                {"role": "user",   "content": (
                    "Compare Report A and Report B statistically:\n\n"
                    + json.dumps(payload, indent=2)
                )},
            ],
            format="json",
            options={"temperature": 0.05, "num_ctx": 8000},
        )
        raw = response["message"]["content"]
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        log.error(f"Comparison LLM failed: {e}")
        return {
            "headline": f"Pattern preservation score: {preservation_score:.1%}",
            "preserved_patterns": ["Statistical analysis completed — LLM narrative unavailable"],
            "drifted_patterns": [],
            "auditor_conclusion": f"Automated analysis shows {preservation_score:.1%} pattern preservation."
        }


def _fallback_narrative(fp: dict) -> dict:
    """Generate a simple programmatic narrative when LLM is unavailable."""
    numeric_patterns = {}
    for col, stats in fp["numeric_stats"].items():
        skewness = stats["skewness"]
        shape = "right-skewed" if skewness > 0.5 else "left-skewed" if skewness < -0.5 else "approximately normal"
        numeric_patterns[col] = (
            f"Mean={stats['mean']}, Median={stats['median']}, Std={stats['std']} "
            f"(range [{stats['min']}, {stats['max']}], {shape})"
        )
    categorical_patterns = {}
    for col, stats in fp["categorical_stats"].items():
        top = list(stats["top_values"].items())[:2]
        top_str = ", ".join(f"{k}={v:.1%}" for k, v in top)
        categorical_patterns[col] = f"{stats['unique_count']} unique values. Top: {top_str}"

    return {
        "overall_summary": (
            f"Dataset with {fp['shape']['rows']} rows, {fp['shape']['columns']} columns. "
            f"{len(fp['numeric_stats'])} numeric, {len(fp['categorical_stats'])} categorical."
        ),
        "numeric_patterns":      numeric_patterns,
        "categorical_patterns":  categorical_patterns,
        "correlation_highlights": "See correlation matrix in full report.",
        "data_quality_notes":    str(fp["missing_rates"]),
    }
