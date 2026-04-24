"""
agents/bias_profiler_agent.py — Bias Profiler Agent (Llama3.2:3b).

Identifies probable protected attribute columns and outcome columns
from column names, sample values, and statistical distributions.

Protected attributes: gender, race, age, religion, disability, national_origin
Outcome columns: hired, approved, diagnosed, loan_approved, credit_score_bucket
"""

from __future__ import annotations

import json
import re
from typing import Optional

import ollama
from pydantic import ValidationError

from agents.schemas import AttributeDetection, AttributeType, BiasProfilerOutput
from config import settings
from utils.logger import get_logger

# ─────────────────────────────────────────────────────────────────────────────
# Keyword fallbacks
# ─────────────────────────────────────────────────────────────────────────────

_PROTECTED_KEYWORDS = {
    "gender", "sex", "race", "ethnicity", "age", "religion", "disability",
    "national_origin", "nationality", "marital_status", "pregnancy",
    "color", "ancestry", "veteran_status",
}
_OUTCOME_KEYWORDS = {
    "hired", "approved", "rejected", "decision", "outcome", "label",
    "target", "result", "status", "admitted", "selected", "promoted",
    "terminated", "fired", "score_bucket", "grade", "diagnosis",
}

_SYSTEM_PROMPT = """You are a fairness and bias detection expert.
Identify which columns in a dataset are protected attributes (race, gender, age, etc.)
and which are outcome/decision columns (hired, approved, rejected, etc.).
Respond ONLY with valid JSON."""

_USER_PROMPT = """Dataset columns and statistics:
{col_info}

Identify:
1. protected_attributes — columns representing demographic or legally protected characteristics
2. outcome_columns — columns representing decisions, classifications, or outcomes that could be subject to discrimination

Return JSON:
{{
  "protected_attributes": [
    {{"column_name": "<name>", "confidence": 0.0-1.0, "detected_type": "protected_attribute", "reasoning": "<why>"}}
  ],
  "outcome_columns": [
    {{"column_name": "<name>", "confidence": 0.0-1.0, "detected_type": "outcome", "reasoning": "<why>"}}
  ]
}}

Only include columns you are at least 60% confident about."""


def _rule_based_detect(column_stats: dict) -> BiasProfilerOutput:
    """Keyword-based fallback detection."""
    protected, outcomes = [], []
    for col in column_stats:
        col_lower = col.lower()
        if any(k in col_lower for k in _PROTECTED_KEYWORDS):
            protected.append(AttributeDetection(
                column_name=col, confidence=0.70,
                detected_type=AttributeType.PROTECTED_ATTRIBUTE,
                reasoning=f"[FALLBACK] Column name matches protected attribute keyword."
            ))
        if any(k in col_lower for k in _OUTCOME_KEYWORDS):
            outcomes.append(AttributeDetection(
                column_name=col, confidence=0.70,
                detected_type=AttributeType.OUTCOME,
                reasoning=f"[FALLBACK] Column name matches outcome keyword."
            ))
    return BiasProfilerOutput(protected_attributes=protected, outcome_columns=outcomes)


def run_bias_profiler_agent(audit_id: str, column_stats: dict) -> BiasProfilerOutput:
    log = get_logger("bias_profiler_agent", job_id=audit_id, phase="BIAS_PROFILING")

    col_info_lines = []
    for col, info in column_stats.items():
        samples = info.get("sample_values", [])[:5]
        col_info_lines.append(f"- {col} (type={info.get('dtype','?')}, samples={samples})")
    col_info = "\n".join(col_info_lines)

    for attempt in range(1, 4):
        try:
            client = ollama.Client(host=settings.ollama_base_url)
            resp = client.chat(
                model=settings.secondary_model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": _USER_PROMPT.format(col_info=col_info)},
                ],
                format="json",
                options={"temperature": 0.05, "num_ctx": 2048},
            )
            raw = _try_parse(resp["message"]["content"])
            if raw:
                result = BiasProfilerOutput(**raw)
                log.info(f"✅ Detected {len(result.protected_attributes)} protected attrs, {len(result.outcome_columns)} outcomes")
                return result
        except Exception as e:
            log.warning(f"Attempt {attempt} failed: {e}")

    log.warning("All attempts failed — using rule-based fallback")
    return _rule_based_detect(column_stats)


def _try_parse(text: str) -> Optional[dict]:
    try: return json.loads(text.strip())
    except Exception: pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try: return json.loads(m.group(0))
        except Exception: pass
    return None
