"""
agents/profiler_agent.py — Schema Profiler Agent (Qwen2.5:7b).

Classifies every column in the dataset as PII / PHI / SENSITIVE / SAFE
with a confidence score and domain context.

Retry strategy:
  - Attempt 1: Full prompt with all column stats
  - Attempt 2: Simplified prompt (names + sample values only)
  - Attempt 3: Minimal prompt (column names only)
  - After 3 failures: Rule-based keyword fallback (never fails)
"""

from __future__ import annotations

import json
import re
from typing import Optional

import ollama
from pydantic import ValidationError
from tenacity import retry, stop_after_attempt, wait_fixed

from agents.schemas import (
    ColumnProfile, ComplianceAction, DataTypeCategory,
    DomainContext, ProfilerOutput, SensitivityClass,
)
from config import settings
from utils.logger import get_logger

# ─────────────────────────────────────────────────────────────────────────────
# Rule-based fallback keyword maps
# ─────────────────────────────────────────────────────────────────────────────

_PII_KEYWORDS = {
    "name", "email", "phone", "address", "ssn", "social_security",
    "passport", "driver_license", "license_plate", "ip_address", "mac_address",
    "applicant_id", "user_id", "customer_id", "client_id", "person_id",
}
_PHI_KEYWORDS = {
    "diagnosis", "icd", "mrn", "medical_record", "patient_id", "date_of_birth",
    "dob", "medication", "prescription", "treatment", "symptom", "health",
    "clinical", "discharge", "admission", "vitals", "lab_result",
}
_SENSITIVE_KEYWORDS = {
    "gender", "sex", "race", "ethnicity", "religion", "political",
    "salary", "income", "wage", "credit_score", "account_number",
    "loan", "debt", "disability", "age",
}
_ID_PATTERNS = re.compile(r"_id$|_key$|_no$|_num$|_code$|^id$|^uid$", re.I)
_NUMERIC_DTYPES = {"int64", "float64", "int32", "float32", "int16", "float16"}
_DATE_PATTERNS = re.compile(r"date|time|timestamp|year|month|day", re.I)


def _rule_based_classify(col_name: str, dtype: str, sample_values: list) -> ColumnProfile:
    """Deterministic keyword fallback — always returns a valid ColumnProfile."""
    col_lower = col_name.lower()
    sample_str = " ".join(str(v) for v in sample_values[:5]).lower()

    # Detect data type category
    if dtype in _NUMERIC_DTYPES:
        type_cat = DataTypeCategory.NUMERICAL
    elif _DATE_PATTERNS.search(col_lower):
        type_cat = DataTypeCategory.DATETIME
    elif _ID_PATTERNS.search(col_lower):
        type_cat = DataTypeCategory.ID
    else:
        type_cat = DataTypeCategory.CATEGORICAL

    # Detect sensitivity
    if any(k in col_lower for k in _PHI_KEYWORDS):
        sens = SensitivityClass.PHI
        confidence = 0.75
        reason = f"Column name matches PHI keyword patterns."
    elif any(k in col_lower for k in _PII_KEYWORDS):
        sens = SensitivityClass.PII
        confidence = 0.75
        reason = f"Column name matches PII keyword patterns."
    elif any(k in col_lower for k in _SENSITIVE_KEYWORDS):
        sens = SensitivityClass.SENSITIVE
        confidence = 0.65
        reason = f"Column name matches SENSITIVE attribute patterns."
    elif type_cat == DataTypeCategory.ID:
        # Default generic IDs to SAFE unless they hit a specific PII/PHI word above
        sens = SensitivityClass.SAFE
        confidence = 0.8
        reason = "Generic ID column detected (assumed non-PII without further context)."
    else:
        sens = SensitivityClass.SAFE
        confidence = 0.55
        reason = "No PII/PHI/SENSITIVE keyword patterns detected."

    # Detect domain
    domain = DomainContext.GENERAL
    if any(k in col_lower or k in sample_str for k in ("patient", "diagnosis", "medical", "clinical", "mrn")):
        domain = DomainContext.HEALTHCARE
    elif any(k in col_lower or k in sample_str for k in ("loan", "credit", "bank", "transaction", "salary")):
        domain = DomainContext.FINANCIAL
    elif any(k in col_lower or k in sample_str for k in ("employee", "hire", "department", "position")):
        domain = DomainContext.HR

    return ColumnProfile(
        sensitivity_class=sens,
        confidence=confidence,
        data_type_category=type_cat,
        domain_context=domain,
        reasoning=f"[FALLBACK] {reason}",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Prompt builder
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a data privacy expert specializing in HIPAA, GDPR, and GLBA compliance.
Your task is to classify dataset columns for sensitivity level.

Respond ONLY with valid JSON. No explanation, no markdown, no code blocks. Pure JSON only.

Classification rules (CRITICAL - USE CONTEXT):
- PII: Direct personal identifiers (e.g., Patient Name, Personal Email, SSN, Patient ID, Employee ID). NOTE: Generic IDs like 'Product SKU', 'Transaction ID', or 'Store ID' are NOT PII. Look at the domain context.
- PHI: Medical record numbers, diagnoses, dates of birth, health conditions, medications.
- SENSITIVE: Demographics and private financials (e.g., Race, Gender, Age, Salary, Income, Credit Score, Religion, Disability). NOTE: 'Gender' is sensitive due to anti-discrimination laws.
- SAFE: Generic measurements, non-personal IDs (Transaction ID), job ranks/titles (Rank is public), flags, general categoricals. If an ID cannot be tied to a human, it is SAFE.

Domain rules:
- healthcare: columns related to patients, clinical data, diagnoses
- financial: columns related to loans, credit, transactions, salaries
- hr: columns related to employees, hiring, compensation
- education: columns related to students, grades, admissions
- general: everything else"""

_USER_PROMPT_FULL = """Classify these dataset columns.

Column statistics:
{stats_json}

Sample values per column:
{samples_json}

Return JSON in this exact structure:
{{
  "columns": {{
    "<column_name>": {{
      "sensitivity_class": "PII" | "PHI" | "SENSITIVE" | "SAFE",
      "confidence": <float 0.0-1.0>,
      "data_type_category": "categorical" | "numerical" | "datetime" | "text" | "id",
      "domain_context": "healthcare" | "financial" | "hr" | "education" | "general",
      "reasoning": "<one sentence>"
    }}
  }}
}}

Columns to classify: {column_names}"""

_USER_PROMPT_SIMPLE = """Classify these columns by sensitivity. Return ONLY JSON.

Columns and sample values: {samples_json}

JSON format:
{{"columns": {{"<col>": {{"sensitivity_class": "PII"|"PHI"|"SENSITIVE"|"SAFE", "confidence": 0.0-1.0, "data_type_category": "categorical"|"numerical"|"datetime"|"text"|"id", "domain_context": "healthcare"|"financial"|"hr"|"education"|"general", "reasoning": "brief reason"}}}}}}"""

_USER_PROMPT_MINIMAL = """Classify these column names by privacy sensitivity. Return ONLY JSON.
Names: {column_names}
Format: {{"columns": {{"<name>": {{"sensitivity_class": "PII"|"PHI"|"SENSITIVE"|"SAFE","confidence":0.8,"data_type_category":"categorical","domain_context":"general","reasoning":"keyword match"}}}}}}"""


# ─────────────────────────────────────────────────────────────────────────────
# JSON extraction helpers
# ─────────────────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> Optional[dict]:
    """Extract JSON from LLM response — handles markdown code blocks."""
    # Try direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Extract from ```json ... ``` blocks
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Find first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# LLM call with retry
# ─────────────────────────────────────────────────────────────────────────────

def _call_llm(system: str, user: str) -> Optional[dict]:
    """Call Qwen2.5:7b and return parsed JSON dict, or None on failure."""
    try:
        client = ollama.Client(host=settings.ollama_base_url)
        response = client.chat(
            model=settings.primary_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            format="json",
            options={"temperature": 0.05, "num_ctx": 4096},
        )
        text = response["message"]["content"]
        return _extract_json(text)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Main agent function
# ─────────────────────────────────────────────────────────────────────────────

def run_profiler_agent(job_id: str, column_stats: dict) -> ProfilerOutput:
    """
    Classify all columns using Qwen2.5:7b with 3-attempt retry + fallback.

    Args:
        job_id:       Current pipeline job ID (for logging)
        column_stats: Output from DuckDB profiling (per-column stats dict)

    Returns:
        ProfilerOutput with a ColumnProfile per column.
    """
    log = get_logger("profiler_agent", job_id=job_id, phase="PROFILING")
    col_names = list(column_stats.keys())
    log.info(f"Profiling {len(col_names)} columns: {col_names}")

    # Build compact stats and samples for prompt
    stats_summary: dict = {}
    samples_summary: dict = {}
    for col, info in column_stats.items():
        stats_summary[col] = {
            "dtype":        info.get("dtype", "object"),
            "missing_pct":  info.get("missing_pct", 0),
            "unique_values":info.get("unique_values", 0),
            "stats":        info.get("stats"),
        }
        samples_summary[col] = info.get("sample_values", [])

    # ── Attempt 1: Full prompt ─────────────────────────────────────────────
    log.info("Attempt 1/3 — full stats prompt...")
    raw = _call_llm(
        _SYSTEM_PROMPT,
        _USER_PROMPT_FULL.format(
            stats_json=json.dumps(stats_summary, default=str),
            samples_json=json.dumps(samples_summary, default=str),
            column_names=", ".join(col_names),
        ),
    )
    result = _parse_and_validate(raw, col_names, log)
    if result:
        log.info(f"✅ Profiler succeeded on attempt 1 — {len(result.columns)} columns classified")
        return result

    # ── Attempt 2: Simplified prompt ──────────────────────────────────────
    log.warning("Attempt 1 failed. Attempt 2/3 — simplified prompt...")
    raw = _call_llm(
        _SYSTEM_PROMPT,
        _USER_PROMPT_SIMPLE.format(
            samples_json=json.dumps(samples_summary, default=str),
        ),
    )
    result = _parse_and_validate(raw, col_names, log)
    if result:
        log.info(f"✅ Profiler succeeded on attempt 2 — {len(result.columns)} columns classified")
        return result

    # ── Attempt 3: Minimal prompt ──────────────────────────────────────────
    log.warning("Attempt 2 failed. Attempt 3/3 — minimal prompt...")
    raw = _call_llm(
        _SYSTEM_PROMPT,
        _USER_PROMPT_MINIMAL.format(column_names=", ".join(col_names)),
    )
    result = _parse_and_validate(raw, col_names, log)
    if result:
        log.info(f"✅ Profiler succeeded on attempt 3 — {len(result.columns)} columns classified")
        return result

    # ── Rule-based fallback ────────────────────────────────────────────────
    log.warning("All 3 LLM attempts failed — activating rule-based fallback classifier.")
    profiles: dict[str, ColumnProfile] = {}
    for col, info in column_stats.items():
        profiles[col] = _rule_based_classify(
            col_name=col,
            dtype=info.get("dtype", "object"),
            sample_values=info.get("sample_values", []),
        )
        log.info(f"  [FALLBACK] {col} → {profiles[col].sensitivity_class.value} ({profiles[col].confidence:.2f})")

    return ProfilerOutput(columns=profiles)


def _parse_and_validate(raw: Optional[dict], col_names: list[str],
                        log) -> Optional[ProfilerOutput]:
    """Try to parse and validate LLM output. Returns None if invalid."""
    if not raw or "columns" not in raw:
        return None
    try:
        output = ProfilerOutput(**raw)
        # Ensure all columns are present — fill missing with SAFE fallback
        for col in col_names:
            if col not in output.columns:
                output.columns[col] = ColumnProfile(
                    sensitivity_class=SensitivityClass.SAFE,
                    confidence=0.5,
                    data_type_category=DataTypeCategory.CATEGORICAL,
                    domain_context=DomainContext.GENERAL,
                    reasoning="Not returned by LLM — defaulted to SAFE.",
                )
        return output
    except (ValidationError, Exception) as e:
        log.warning(f"Validation failed: {e}")
        return None
