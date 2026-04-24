"""
Backend/generation_bridge.py — Thin adapter between Backend/main.py and generation/.

Design rules:
  1. Backend/main.py calls ONLY these functions — no direct generation/ imports in main.py.
  2. Every function is synchronous (called via asyncio.to_thread from async endpoints).
  3. If generation/ imports fail (e.g., Ollama not installed), AI_AVAILABLE = False
     and the backend silently falls back to its built-in rule-based logic.
  4. This file lives in Backend/ — it resolves generation/ relative to project root.

Usage in main.py:
    from generation_bridge import bridge
    classifications = bridge.ai_classify_columns(df, job_id)
    synth_df, quality = bridge.ai_run_synthesis(df, decisions, rows, job_id, output_dir)
    findings = bridge.ai_compute_bias_metrics(df, attrs, outcomes, audit_id)
"""

from __future__ import annotations

import sys
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

# ── Resolve generation/ root and inject into sys.path ────────────────────────
_THIS_DIR    = Path(__file__).resolve().parent          # Backend/
_PROJECT_DIR = _THIS_DIR.parent                         # Antraa/
_GEN_DIR     = _PROJECT_DIR / "generation"

if str(_GEN_DIR) not in sys.path:
    sys.path.insert(0, str(_GEN_DIR))

# Also set working directory for .env resolution inside config.py
# config.py reads .env relative to cwd — point it at generation/
_ORIGINAL_CWD = os.getcwd()

# ── Try importing generation modules ─────────────────────────────────────────
AI_AVAILABLE = False
_import_error: str = ""

try:
    os.chdir(str(_GEN_DIR))          # So config.py finds generation/.env
    from config import settings                                          # noqa: E402
    from agents.profiler_agent import run_profiler_agent                 # noqa: E402
    from agents.compliance_agent import run_compliance_agent             # noqa: E402
    from agents.validator_agent import run_validator_agent               # noqa: E402
    from agents.bias_profiler_agent import run_bias_profiler_agent       # noqa: E402
    from agents.bias_metrics_agent import run_bias_metrics_agent         # noqa: E402
    from agents.bias_interpreter_agent import run_bias_interpreter_agent # noqa: E402
    from agents.schemas import ProfilerOutput, ColumnProfile             # noqa: E402
    from synthesis.generator import run_synthesis                        # noqa: E402
    AI_AVAILABLE = True
    os.chdir(_ORIGINAL_CWD)
except Exception as e:
    _import_error = str(e)
    os.chdir(_ORIGINAL_CWD)


# ─────────────────────────────────────────────────────────────────────────────
# Data contract: what the bridge returns to main.py
# ─────────────────────────────────────────────────────────────────────────────

# ColumnClassification dict shape (matches what main.py's classify_column() returns):
# {
#   "sensitivity_class": "PII"|"PHI"|"SENSITIVE"|"SAFE",
#   "confidence_score":  float,
#   "compliance_action": "SUPPRESS"|"MASK"|"GENERALIZE"|"RETAIN_WITH_NOISE"|"RETAIN",
#   "compliance_rule_citation": str,
#   "inferred_type": "categorical"|"numerical"|"datetime"|"text"|"id",
#   "domain_context": str,
#   "regulation_id":  str,
# }

# BiasFinding dict shape (matches main.py's existing findings list):
# {
#   "metric_name": str,
#   "metric_value": float,
#   "severity": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW",
#   "protected_attribute_column": str,
#   "outcome_column": str,
#   "affected_groups": {group: rate},
#   "interpreter_narration": str,
# }


class GenerationBridge:
    """
    Facade over the generation/ AI pipeline.
    All methods are synchronous — wrap with asyncio.to_thread() in async contexts.
    """

    # ── Status ────────────────────────────────────────────────────────────────

    @property
    def available(self) -> bool:
        return AI_AVAILABLE

    def status(self) -> Dict[str, Any]:
        return {
            "ai_available": AI_AVAILABLE,
            "generation_dir": str(_GEN_DIR),
            "import_error": _import_error if not AI_AVAILABLE else None,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # CORE PIPELINE
    # ─────────────────────────────────────────────────────────────────────────

    def ai_classify_columns(self, df: pd.DataFrame, job_id: str) -> Dict[str, Dict]:
        """
        Classify all columns using Qwen2.5:7b + ChromaDB RAG.

        Returns:
            Dict keyed by column name, each value is a ColumnClassification dict.
        """
        if not AI_AVAILABLE:
            return {}

        # Build column_stats in the format the profiler agent expects
        column_stats = _df_to_column_stats(df)

        # Run Schema Profiler (Qwen2.5:7b)
        profiler_out = run_profiler_agent(job_id, column_stats)

        # Run RAG Compliance Agent (Qwen2.5:7b, same loaded instance)
        compliance_out = run_compliance_agent(job_id, profiler_out, column_stats)

        # Merge into a flat dict per column
        result: Dict[str, Dict] = {}
        for col, profile in profiler_out.columns.items():
            plan_entry = compliance_out.plan.get(col)
            result[col] = {
                "sensitivity_class":       profile.sensitivity_class.value,
                "confidence_score":        profile.confidence,
                "inferred_type":           profile.data_type_category.value,
                "domain_context":          profile.domain_context.value,
                "compliance_action":       plan_entry.action.value if plan_entry else "RETAIN",
                "compliance_rule_citation":plan_entry.citation if plan_entry else "N/A",
                "regulation_id":           plan_entry.regulation_id if plan_entry else "NONE",
                "regulation_name":         plan_entry.regulation_name if plan_entry else "",
                "justification":           plan_entry.justification if plan_entry else "",
                "reasoning":               profile.reasoning,
            }
        return result

    def ai_run_synthesis(
        self,
        df_original: pd.DataFrame,
        decisions: Dict[str, Any],  # {col: ColumnDecision-like object or dict}
        target_rows: int,
        job_id: str,
        output_dir: Path,
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Generate synthetic data using SDV GaussianCopulaSynthesizer + Diffprivlib DP.

        Args:
            decisions: Dict of col → object/dict with .override_action and .epsilon_budget
        Returns:
            (synthetic_df, quality_scores_dict)
        """
        if not AI_AVAILABLE:
            return pd.DataFrame(), {}

        # Convert decisions to the format synthesis/generator.py expects
        column_config = _decisions_to_column_config(decisions)

        synth_df, quality_scores, tracker = run_synthesis(
            job_id=job_id,
            df_original=df_original,
            column_config=column_config,
            num_rows=target_rows,
            output_dir=output_dir,
        )
        # tracker is a plain dict returned by run_synthesis() — store it directly
        quality_scores["epsilon_budget_summary"] = tracker
        return synth_df, quality_scores

    def ai_validate(
        self,
        job_id: str,
        quality_scores: Dict,
        approval_payload: Any,
    ) -> Dict[str, str]:
        """
        Run Validation Reporter Agent (Llama3.2:3b) to narrate quality scores.
        Returns dict with keys: overall_assessment, quality_rating, certificate_statement, etc.
        """
        if not AI_AVAILABLE:
            return {}

        # Convert approval payload to dict
        approval_dict = {}
        if hasattr(approval_payload, "decisions"):
            for d in approval_payload.decisions:
                approval_dict[d.column_name] = {"epsilon_budget": d.epsilon_budget or 1.0}

        narrative = run_validator_agent(job_id, quality_scores, approval_dict)
        return narrative.model_dump()

    # ─────────────────────────────────────────────────────────────────────────
    # BIAS AUDIT PIPELINE
    # ─────────────────────────────────────────────────────────────────────────

    def ai_detect_bias_columns(
        self, df: pd.DataFrame, audit_id: str
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Detect protected attributes and outcome columns using Llama3.2:3b.

        Returns:
            (protected_candidates, outcome_candidates)
            Each is a list of {"column": str, "confidence": float, "reasoning": str}
        """
        if not AI_AVAILABLE:
            return [], []

        column_stats = _df_to_column_stats(df)
        profiler_out = run_bias_profiler_agent(audit_id, column_stats)

        protected = [
            {
                "column":     a.column_name,
                "confidence": a.confidence,
                "reasoning":  a.reasoning,
            }
            for a in profiler_out.protected_attributes
        ]
        outcomes = [
            {
                "column":     o.column_name,
                "confidence": o.confidence,
                "reasoning":  o.reasoning,
            }
            for o in profiler_out.outcome_columns
        ]
        return protected, outcomes

    def ai_compute_bias_metrics(
        self,
        df: pd.DataFrame,
        confirmed_attributes: List[str],
        confirmed_outcomes: List[str],
        audit_id: str,
    ) -> List[Dict]:
        """
        Compute bias metrics using AIF360 + SciPy and interpret with Llama3.2:3b.

        Returns:
            List of finding dicts matching main.py's existing findings shape.
        """
        if not AI_AVAILABLE:
            return []

        metrics_out = run_bias_metrics_agent(
            audit_id=audit_id,
            df=df,
            confirmed_attributes=confirmed_attributes,
            confirmed_outcomes=confirmed_outcomes,
        )

        # Interpret findings
        interp_out = run_bias_interpreter_agent(audit_id, metrics_out.findings)
        interp_map = {i.finding_id: i for i in interp_out.interpretations}

        # Convert to main.py's findings shape
        findings = []
        for finding in metrics_out.findings:
            interp = interp_map.get(finding.finding_id)
            findings.append({
                "metric_name":               finding.metric_name,
                "metric_value":              finding.metric_value,
                "severity":                  finding.severity.value,
                "protected_attribute_column":finding.protected_attribute,
                "outcome_column":            finding.outcome_column,
                "affected_groups":           finding.group_rates,
                "interpreter_narration":     interp.plain_english if interp else "",
                "legal_standard":            interp.legal_standard if interp else "",
                "practical_implication":     interp.practical_implication if interp else "",
                "finding_id":                finding.finding_id,
            })

        return findings


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _df_to_column_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Convert a DataFrame to the column_stats dict the generation agents expect."""
    stats = {}
    for col in df.columns:
        s = df[col]
        entry: Dict[str, Any] = {
            "dtype":         str(s.dtype),
            "missing_pct":   round(float(s.isna().mean()) * 100, 2),
            "unique_values": int(s.nunique(dropna=True)),
            "sample_values": [str(v) for v in s.dropna().head(5).tolist()],
        }
        if pd.api.types.is_numeric_dtype(s):
            sn = s.dropna()
            if not sn.empty:
                entry["stats"] = {
                    "mean": round(float(sn.mean()), 4),
                    "std":  round(float(sn.std()), 4),
                    "min":  round(float(sn.min()), 4),
                    "max":  round(float(sn.max()), 4),
                }
        stats[col] = entry
    return stats


def _decisions_to_column_config(decisions: Dict[str, Any]) -> Dict[str, Dict]:
    """Convert main.py ColumnDecision objects/dicts to generation/ column_config format."""
    config = {}
    for col, decision in decisions.items():
        if hasattr(decision, "override_action"):
            action = decision.override_action or "RETAIN"
            epsilon = decision.epsilon_budget or 1.0
            approved = decision.approved if hasattr(decision, "approved") else True
        elif isinstance(decision, dict):
            action = decision.get("override_action") or decision.get("action", "RETAIN")
            epsilon = decision.get("epsilon_budget", 1.0)
            approved = decision.get("approved", True)
        else:
            action, epsilon, approved = "RETAIN", 1.0, True

        if not approved:
            action = "SUPPRESS"

        config[col] = {"action": action, "epsilon_budget": float(epsilon)}
    return config


# ── Module-level singleton ────────────────────────────────────────────────────
bridge = GenerationBridge()
