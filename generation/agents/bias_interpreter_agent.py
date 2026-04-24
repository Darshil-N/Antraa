"""
agents/bias_interpreter_agent.py — Bias Interpreter Agent (Llama3.2:3b).

Generates plain-English interpretations for each bias finding,
citing the relevant legal standard and practical implications.
"""

from __future__ import annotations

import json
import re
from typing import Optional

import ollama
from pydantic import ValidationError

from agents.schemas import (
    BiasFinding, BiasInterpreterOutput, FindingInterpretation, SeverityLevel,
)
from config import settings
from utils.logger import get_logger

_LEGAL_STANDARDS = {
    "DIR": "EEOC 80% Rule (29 CFR Part 1607) / ECOA Disparate Impact Standard (12 CFR Part 202)",
    "DPD": "Title VII Civil Rights Act / EEOC Uniform Guidelines (29 CFR Part 1607)",
    "EOD": "EEOC Uniform Guidelines — Equal Opportunity in Employment",
    "SPD": "EEOC / Fair Housing Act / ECOA — Statistical Parity Standard",
    "CDI": "EEOC Uniform Guidelines — Adequate Sample Size for Adverse Impact Analysis",
}

_SEVERITY_THRESHOLDS = {
    "DIR": "Legal threshold: 0.80 (EEOC 80% rule). Below 0.60 = CRITICAL.",
    "DPD": "Legal threshold: 0.10. Above 0.30 = CRITICAL.",
    "EOD": "Legal threshold: 0.10. Above 0.20 = CRITICAL.",
    "SPD": "Legal threshold: 0.10. Above 0.30 = CRITICAL.",
    "CDI": "Threshold: 0.10 representation ratio. Below 0.05 = CRITICAL.",
}

_SYSTEM_PROMPT = """You are a fairness and legal compliance expert writing a bias audit report.
For each bias finding, provide a plain-English interpretation that a non-technical decision-maker can understand.
Respond ONLY with valid JSON."""

_USER_PROMPT = """Bias finding to interpret:
Finding ID: {finding_id}
Protected attribute: {attr}
Outcome column: {outcome}
Metric: {metric} ({metric_desc})
Value: {value} (severity: {severity})
Group rates: {group_rates}
Legal standard: {legal_std}
Threshold context: {threshold}

Return JSON:
{{
  "finding_id": "{finding_id}",
  "plain_english": "<2-3 sentence explanation a manager or HR professional can understand>",
  "legal_standard": "<citation of applicable law and threshold>",
  "practical_implication": "<what this means if this data is used to train an AI model>",
  "severity_explanation": "<why this severity level was assigned>"
}}"""

_METRIC_DESCRIPTIONS = {
    "DIR": "Disparate Impact Ratio — ratio of positive outcome rates between least-favored and most-favored group. Threshold: 0.80.",
    "DPD": "Demographic Parity Difference — absolute gap in positive outcome rates between groups. Threshold: 0.10.",
    "EOD": "Equal Opportunity Difference — gap in true positive rates (recall) between groups. Threshold: 0.10.",
    "SPD": "Statistical Parity Difference — probability gap in positive outcomes across marginal distribution. Threshold: 0.10.",
    "CDI": "Class Distribution Imbalance — minority-to-majority group count ratio. Threshold: 0.10.",
}


def _build_fallback_interpretation(f: BiasFinding) -> FindingInterpretation:
    g = f.group_rates
    group_str = ", ".join(f"{k}: {v:.1%}" if isinstance(v, float) else f"{k}: {v}" for k, v in list(g.items())[:4])
    return FindingInterpretation(
        finding_id=f.finding_id,
        plain_english=(
            f"The {f.metric_name} metric for '{f.protected_attribute}' vs '{f.outcome_column}' "
            f"is {f.metric_value:.4f} (severity: {f.severity.value}). "
            f"Group breakdown: {group_str}."
        ),
        legal_standard=_LEGAL_STANDARDS.get(f.metric_name, "Applicable fairness law"),
        practical_implication=(
            f"Training an AI model on this data may perpetuate the observed {f.severity.value.lower()} "
            f"disparity in {f.outcome_column} outcomes across {f.protected_attribute} groups."
        ),
        severity_explanation=_SEVERITY_THRESHOLDS.get(f.metric_name, "Severity based on deviation from legal threshold."),
    )


def run_bias_interpreter_agent(audit_id: str,
                               findings: list[BiasFinding]) -> BiasInterpreterOutput:
    log = get_logger("bias_interpreter_agent", job_id=audit_id, phase="BIAS_INTERPRET")
    log.info(f"Interpreting {len(findings)} bias findings...")

    interpretations: list[FindingInterpretation] = []

    for f in findings:
        log.info(f"  Interpreting {f.finding_id} ({f.severity.value})...")
        interp = None

        for attempt in range(1, 3):
            try:
                client = ollama.Client(host=settings.ollama_base_url)
                resp = client.chat(
                    model=settings.secondary_model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user",   "content": _USER_PROMPT.format(
                            finding_id=f.finding_id,
                            attr=f.protected_attribute,
                            outcome=f.outcome_column,
                            metric=f.metric_name,
                            metric_desc=_METRIC_DESCRIPTIONS.get(f.metric_name, ""),
                            value=f.metric_value,
                            severity=f.severity.value,
                            group_rates=json.dumps(f.group_rates),
                            legal_std=_LEGAL_STANDARDS.get(f.metric_name, "N/A"),
                            threshold=_SEVERITY_THRESHOLDS.get(f.metric_name, "N/A"),
                        )},
                    ],
                    format="json",
                    options={"temperature": 0.2, "num_ctx": 2048},
                )
                raw = _try_parse(resp["message"]["content"])
                if raw:
                    raw["finding_id"] = f.finding_id
                    interp = FindingInterpretation(**raw)
                    break
            except Exception as e:
                log.warning(f"  Attempt {attempt} failed for {f.finding_id}: {e}")

        if interp is None:
            log.warning(f"  Using fallback for {f.finding_id}")
            interp = _build_fallback_interpretation(f)

        interpretations.append(interp)

    # Generate executive summary
    critical = [f for f in findings if f.severity == SeverityLevel.CRITICAL]
    high = [f for f in findings if f.severity == SeverityLevel.HIGH]
    exec_summary = _generate_executive_summary(findings, critical, high, audit_id)

    log.info(f"✅ Bias interpretation complete — {len(interpretations)} interpretations")
    return BiasInterpreterOutput(
        interpretations=interpretations,
        executive_summary=exec_summary,
    )


def _generate_executive_summary(all_findings: list, critical: list, high: list,
                                 audit_id: str) -> str:
    attrs = list({f.protected_attribute for f in all_findings})
    if not all_findings:
        return "No significant bias findings were detected in this dataset."
    return (
        f"This bias audit (ID: {audit_id}) identified {len(all_findings)} fairness findings "
        f"across {len(attrs)} protected attribute(s): {', '.join(attrs)}. "
        f"Of these, {len(critical)} finding(s) are CRITICAL and {len(high)} are HIGH severity, "
        f"indicating patterns that may constitute adverse impact under applicable employment and lending law. "
        f"Organizations using this dataset to train predictive models should carefully review the CRITICAL "
        f"and HIGH findings before deployment and consult with legal counsel regarding regulatory obligations."
    )


def _try_parse(text: str) -> Optional[dict]:
    try: return json.loads(text.strip())
    except Exception: pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try: return json.loads(m.group(0))
        except Exception: pass
    return None
