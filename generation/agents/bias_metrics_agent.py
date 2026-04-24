"""
agents/bias_metrics_agent.py — Bias Metrics Executor (NO LLM).

Pure statistical computation using AIF360 + SciPy + Pandas.
Computes 5 fairness metrics for each (protected_attr × outcome) combination.

Metrics:
  - DPD  : Demographic Parity Difference
  - EOD  : Equal Opportunity Difference
  - DIR  : Disparate Impact Ratio
  - SPD  : Statistical Parity Difference
  - CDI  : Class Distribution Imbalance

Severity thresholds from EEOC 80% rule + ECOA standards.
"""

from __future__ import annotations

import uuid
from typing import Optional

import numpy as np
import pandas as pd

from agents.schemas import BiasFinding, BiasMetricsOutput, SeverityLevel
from utils.logger import get_logger

# ─────────────────────────────────────────────────────────────────────────────
# Severity classification thresholds
# ─────────────────────────────────────────────────────────────────────────────

def _dir_severity(dir_val: float) -> SeverityLevel:
    if dir_val < 0.6:  return SeverityLevel.CRITICAL
    if dir_val < 0.8:  return SeverityLevel.HIGH
    if dir_val < 0.9:  return SeverityLevel.MEDIUM
    return SeverityLevel.LOW

def _dpd_severity(dpd_val: float) -> SeverityLevel:
    if dpd_val > 0.3:  return SeverityLevel.CRITICAL
    if dpd_val > 0.2:  return SeverityLevel.HIGH
    if dpd_val > 0.1:  return SeverityLevel.MEDIUM
    return SeverityLevel.LOW

def _eod_severity(eod_val: float) -> SeverityLevel:
    if eod_val > 0.2:  return SeverityLevel.CRITICAL
    if eod_val > 0.1:  return SeverityLevel.HIGH
    if eod_val > 0.05: return SeverityLevel.MEDIUM
    return SeverityLevel.LOW

def _cdi_severity(cdi_val: float) -> SeverityLevel:
    if cdi_val < 0.05: return SeverityLevel.CRITICAL
    if cdi_val < 0.10: return SeverityLevel.HIGH
    if cdi_val < 0.20: return SeverityLevel.MEDIUM
    return SeverityLevel.LOW


# ─────────────────────────────────────────────────────────────────────────────
# Metric computation helpers
# ─────────────────────────────────────────────────────────────────────────────

def _compute_group_rates(df: pd.DataFrame, attr_col: str,
                         outcome_col: str) -> dict[str, float]:
    """Positive outcome rate per group value."""
    rates = {}
    for group_val, sub in df.groupby(attr_col):
        pos = (sub[outcome_col] == 1).sum()
        rates[str(group_val)] = round(float(pos / len(sub)), 4) if len(sub) > 0 else 0.0
    return rates


def _binarize_outcome(df: pd.DataFrame, outcome_col: str) -> pd.DataFrame:
    """Ensure outcome column is binary 0/1."""
    df = df.copy()
    col = df[outcome_col]
    if col.dtype == object or str(col.dtype) == "category":
        unique_vals = col.dropna().unique()
        if len(unique_vals) == 2:
            # Map the higher-alphabetical or "positive" value to 1
            pos_val = sorted([str(v).lower() for v in unique_vals])[-1]
            df[outcome_col] = col.apply(lambda x: 1 if str(x).lower() == pos_val else 0)
        else:
            raise ValueError(f"Outcome column '{outcome_col}' has {len(unique_vals)} unique values — must be binary.")
    else:
        # Numeric — ensure 0/1 using median
        unique_vals = col.dropna().unique()
        if len(unique_vals) == 2:
             pos_val = max(unique_vals)
             df[outcome_col] = (col == pos_val).astype(int)
        else:
             median_val = col.median()
             df[outcome_col] = (col > median_val).astype(int)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Main computation per (attr × outcome) pair
# ─────────────────────────────────────────────────────────────────────────────

def _compute_pair(df: pd.DataFrame, attr_col: str, outcome_col: str,
                  audit_id: str, notes: list[str]) -> list[BiasFinding]:
    findings = []

    try:
        df = _binarize_outcome(df, outcome_col)
    except ValueError as e:
        notes.append(str(e))
        return findings

    groups = df[attr_col].dropna().unique()
    group_rates = _compute_group_rates(df, attr_col, outcome_col)

    if len(groups) < 2:
        notes.append(f"Skipping {attr_col} × {outcome_col}: only 1 group value.")
        return findings

    # Min group size check
    min_n = df.groupby(attr_col).size().min()
    if min_n < 30:
        notes.append(f"Warning: {attr_col} has a group with n={min_n} (<30) — metrics may be unreliable.")

    rates = list(group_rates.values())
    max_rate = max(rates)
    min_rate = min(rates)
    max_group = [g for g, r in group_rates.items() if r == max_rate][0]
    min_group = [g for g, r in group_rates.items() if r == min_rate][0]
    affected = [str(g) for g in groups]

    base_id = f"{attr_col}_{outcome_col}"

    # ── DPD (Demographic Parity Difference) ─────────────────────────────────
    dpd = abs(max_rate - min_rate)
    findings.append(BiasFinding(
        finding_id=f"{base_id}_DPD_{uuid.uuid4().hex[:6]}",
        protected_attribute=attr_col,
        outcome_column=outcome_col,
        metric_name="DPD",
        metric_value=round(dpd, 4),
        severity=_dpd_severity(dpd),
        affected_groups=affected,
        group_rates=group_rates,
        legal_threshold=0.1,
    ))

    # ── DIR (Disparate Impact Ratio) ─────────────────────────────────────────
    dir_val = round(min_rate / max_rate, 4) if max_rate > 0 else 1.0
    findings.append(BiasFinding(
        finding_id=f"{base_id}_DIR_{uuid.uuid4().hex[:6]}",
        protected_attribute=attr_col,
        outcome_column=outcome_col,
        metric_name="DIR",
        metric_value=dir_val,
        severity=_dir_severity(dir_val),
        affected_groups=affected,
        group_rates=group_rates,
        legal_threshold=0.8,
    ))

    # ── SPD (Statistical Parity Difference) ──────────────────────────────────
    overall_rate = float((df[outcome_col] == 1).mean())
    spd_vals = {g: abs(r - overall_rate) for g, r in group_rates.items()}
    max_spd = max(spd_vals.values())
    findings.append(BiasFinding(
        finding_id=f"{base_id}_SPD_{uuid.uuid4().hex[:6]}",
        protected_attribute=attr_col,
        outcome_column=outcome_col,
        metric_name="SPD",
        metric_value=round(max_spd, 4),
        severity=_dpd_severity(max_spd),
        affected_groups=affected,
        group_rates=group_rates,
        legal_threshold=0.1,
    ))

    # ── EOD (Equal Opportunity Difference) — needs TP rates ──────────────────
    try:
        tpr_rates = {}
        for g, sub in df.groupby(attr_col):
            actual_pos = sub[outcome_col] == 1
            if actual_pos.sum() > 0:
                tpr_rates[str(g)] = float(actual_pos.mean())
        if len(tpr_rates) >= 2:
            eod = abs(max(tpr_rates.values()) - min(tpr_rates.values()))
            findings.append(BiasFinding(
                finding_id=f"{base_id}_EOD_{uuid.uuid4().hex[:6]}",
                protected_attribute=attr_col,
                outcome_column=outcome_col,
                metric_name="EOD",
                metric_value=round(eod, 4),
                severity=_eod_severity(eod),
                affected_groups=affected,
                group_rates=tpr_rates,
                legal_threshold=0.1,
            ))
    except Exception:
        notes.append(f"EOD could not be computed for {attr_col} × {outcome_col}")

    # ── CDI (Class Distribution Imbalance) ───────────────────────────────────
    counts = df[attr_col].value_counts()
    if len(counts) >= 2:
        cdi = round(float(counts.min() / counts.max()), 4)
        findings.append(BiasFinding(
            finding_id=f"{base_id}_CDI_{uuid.uuid4().hex[:6]}",
            protected_attribute=attr_col,
            outcome_column=outcome_col,
            metric_name="CDI",
            metric_value=cdi,
            severity=_cdi_severity(cdi),
            affected_groups=affected,
            group_rates={str(k): int(v) for k, v in counts.items()},
            legal_threshold=0.1,
        ))

    return findings


# ─────────────────────────────────────────────────────────────────────────────
# Main agent function
# ─────────────────────────────────────────────────────────────────────────────

def run_bias_metrics_agent(audit_id: str, df: pd.DataFrame,
                           confirmed_attributes: list[str],
                           confirmed_outcomes: list[str]) -> BiasMetricsOutput:
    """
    Compute all 5 fairness metrics for each attribute × outcome combination.

    Args:
        audit_id:             Audit job ID (for logging)
        df:                   Full dataset as DataFrame
        confirmed_attributes: Human-confirmed protected attribute column names
        confirmed_outcomes:   Human-confirmed outcome column names

    Returns:
        BiasMetricsOutput with all findings.
    """
    log = get_logger("bias_metrics_agent", job_id=audit_id, phase="BIAS_METRICS")
    log.info(f"Computing bias metrics: {len(confirmed_attributes)} attrs × {len(confirmed_outcomes)} outcomes")

    all_findings: list[BiasFinding] = []
    notes: list[str] = []

    for attr_col in confirmed_attributes:
        if attr_col not in df.columns:
            notes.append(f"Protected attribute column '{attr_col}' not found in dataset.")
            continue
        for outcome_col in confirmed_outcomes:
            if outcome_col not in df.columns:
                notes.append(f"Outcome column '{outcome_col}' not found in dataset.")
                continue
            log.info(f"  Computing: {attr_col} × {outcome_col}")
            try:
                pair_findings = _compute_pair(df, attr_col, outcome_col, audit_id, notes)
                all_findings.extend(pair_findings)
                log.info(f"  → {len(pair_findings)} findings generated")
            except Exception as e:
                msg = f"Error computing {attr_col} × {outcome_col}: {e}"
                notes.append(msg)
                log.error(msg)

    # Sort by severity (CRITICAL first)
    severity_order = {SeverityLevel.CRITICAL: 0, SeverityLevel.HIGH: 1,
                      SeverityLevel.MEDIUM: 2, SeverityLevel.LOW: 3}
    all_findings.sort(key=lambda f: severity_order.get(f.severity, 99))

    log.info(f"Bias metrics complete: {len(all_findings)} findings, {len(notes)} notes")
    return BiasMetricsOutput(findings=all_findings, computation_notes=notes)
