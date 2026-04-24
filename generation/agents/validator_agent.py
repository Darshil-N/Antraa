"""
agents/validator_agent.py — Validation Reporter Agent (Llama3.2:3b).

Receives SDMetrics quality scores after synthesis and generates:
  - A human-readable narrative for the compliance certificate
  - A structured quality rating
  - Column-level concern flags
"""

from __future__ import annotations

import json
import re
from typing import Optional

import ollama
from pydantic import ValidationError

from agents.schemas import QualityRating, ValidationNarrativeOutput
from config import settings
from utils.logger import get_logger

_SYSTEM_PROMPT = """You are a data quality analyst writing a compliance certificate section.
Given synthetic data quality scores, write a professional assessment.
Respond ONLY with valid JSON."""

_USER_PROMPT = """Synthetic data quality report:
Overall quality score: {overall_score:.1%}
Quality rating: {rating}
Per-column KS scores (higher = better, target > 0.85): {ks_scores}
Correlation matrix similarity: {corr_sim:.1%}
Privacy risk score: {privacy_risk:.1%}
Epsilon budgets applied: {epsilon_summary}
Columns below quality threshold (<0.85 KS): {concerns}

Return JSON:
{{
  "overall_assessment": "<2-3 sentence professional assessment>",
  "quality_rating": "{rating}",
  "column_concerns": {concerns_list},
  "privacy_summary": "<1-2 sentences summarising privacy protection applied>",
  "certificate_statement": "<formal 1-sentence statement for the compliance certificate>"
}}"""


def _determine_rating(overall: float) -> str:
    if overall >= 0.90: return QualityRating.EXCELLENT.value
    if overall >= 0.82: return QualityRating.GOOD.value
    if overall >= 0.75: return QualityRating.ACCEPTABLE.value
    return QualityRating.BELOW_THRESHOLD.value


def run_validator_agent(job_id: str, quality_scores: dict,
                        approval_payload: dict) -> ValidationNarrativeOutput:
    log = get_logger("validator_agent", job_id=job_id, phase="VALIDATING")

    overall = quality_scores.get("overall_quality_score", 0.0)
    ks = quality_scores.get("ks_test_scores", {})
    corr = quality_scores.get("correlation_similarity", 0.0)
    privacy_risk = quality_scores.get("privacy_risk_score", 0.0)
    rating = _determine_rating(overall)
    concerns = [col for col, score in ks.items() if isinstance(score, (int, float)) and score < 0.85]

    epsilon_summary = {
        col: v.get("epsilon_budget", 1.0)
        for col, v in approval_payload.items()
        if isinstance(v, dict)
    }

    user_prompt = _USER_PROMPT.format(
        overall_score=overall,
        rating=rating,
        ks_scores=json.dumps({k: round(v, 3) for k, v in list(ks.items())[:10]}, default=str),
        corr_sim=corr,
        privacy_risk=privacy_risk,
        epsilon_summary=json.dumps(epsilon_summary),
        concerns=", ".join(concerns) if concerns else "None",
        concerns_list=json.dumps(concerns),
    )

    for attempt in range(1, 4):
        try:
            client = ollama.Client(host=settings.ollama_base_url)
            resp = client.chat(
                model=settings.secondary_model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                format="json",
                options={"temperature": 0.1, "num_ctx": 2048},
            )
            text = resp["message"]["content"]
            raw = _try_parse(text)
            if raw:
                # Ensure correct enum
                raw["quality_rating"] = rating
                raw["column_concerns"] = concerns
                return ValidationNarrativeOutput(**raw)
        except Exception as e:
            log.warning(f"Validator attempt {attempt} failed: {e}")

    # Fallback
    log.warning("All validator attempts failed — using default narrative")
    return ValidationNarrativeOutput(
        overall_assessment=f"Synthetic data quality score: {overall:.1%}. Generated using SDV GaussianCopulaSynthesizer with differential privacy.",
        quality_rating=QualityRating(rating),
        column_concerns=concerns,
        privacy_summary=f"Differential privacy applied with epsilon budgets ranging from {min(epsilon_summary.values(), default=1.0):.1f} to {max(epsilon_summary.values(), default=1.0):.1f}.",
        certificate_statement=f"This synthetic dataset achieved an overall fidelity score of {overall:.1%} and was generated with mathematical differential privacy guarantees.",
    )


def _try_parse(text: str) -> Optional[dict]:
    try: return json.loads(text.strip())
    except Exception: pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try: return json.loads(m.group(0))
        except Exception: pass
    return None
