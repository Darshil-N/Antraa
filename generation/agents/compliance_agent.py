"""
agents/compliance_agent.py — RAG Compliance Policy Agent (Qwen2.5:7b).

For each PII/PHI/SENSITIVE column:
  1. Build a semantic query from column name + sample values + domain
  2. Retrieve top-3 relevant compliance rule chunks from ChromaDB
  3. Ask Qwen2.5:7b to select the best rule and determine required action
  4. Validate output with Pydantic CompliancePlanEntry

SAFE columns are automatically assigned RETAIN without any LLM call.
Fallback: SUPPRESS for any PII/PHI if LLM fails after 3 retries.
"""

from __future__ import annotations

import json
import re
from typing import Optional

import ollama
from pydantic import ValidationError

from agents.schemas import (
    ComplianceAction, CompliancePlanEntry, CompliancePlanOutput,
    ProfilerOutput, SensitivityClass,
)
from config import settings
from rag.embeddings import query_collection
from utils.logger import get_logger


# ─────────────────────────────────────────────────────────────────────────────
# Default fallback rules per sensitivity class
# ─────────────────────────────────────────────────────────────────────────────

_FALLBACK_RULES: dict[SensitivityClass, CompliancePlanEntry] = {
    SensitivityClass.PII: CompliancePlanEntry(
        action=ComplianceAction.SUPPRESS,
        regulation_id="FALLBACK-PII",
        citation="N/A — rule-based fallback",
        regulation_name="FairSynth Default PII Policy",
        justification="LLM unavailable — defaulting to SUPPRESS for PII column (conservative).",
    ),
    SensitivityClass.PHI: CompliancePlanEntry(
        action=ComplianceAction.SUPPRESS,
        regulation_id="HIPAA-SH-18",
        citation="§164.514(b)(2)(i)(R)",
        regulation_name="HIPAA Safe Harbor — Catch-All",
        justification="LLM unavailable — defaulting to SUPPRESS for PHI column (HIPAA Safe Harbor catch-all).",
    ),
    SensitivityClass.SENSITIVE: CompliancePlanEntry(
        action=ComplianceAction.RETAIN_WITH_NOISE,
        regulation_id="FALLBACK-SENSITIVE",
        citation="N/A — rule-based fallback",
        regulation_name="FairSynth Default Sensitive Policy",
        justification="LLM unavailable — defaulting to RETAIN_WITH_NOISE for SENSITIVE column.",
    ),
    SensitivityClass.SAFE: CompliancePlanEntry(
        action=ComplianceAction.RETAIN,
        regulation_id="NONE",
        citation="N/A",
        regulation_name="No compliance concern",
        justification="Column classified as SAFE — no compliance action required.",
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a compliance expert specializing in HIPAA, GDPR, and GLBA data regulations.
Given a dataset column and relevant compliance rules retrieved from a knowledge base,
determine the correct compliance action for that column.

Available actions:
- SUPPRESS: Remove column entirely. MUST use this for direct personal identifiers (PII) like Employee IDs, SSNs, Patient IDs.
- MASK: Pseudonymize by replacing with realistic fake values (names, emails).
- GENERALIZE: Convert to ranges or buckets (e.g. k-anonymity for age 34 → decade range).
- RETAIN_WITH_NOISE: Keep column but apply differential privacy noise. Best for aggregate statistics or continuous outcomes.
- RETAIN: No action needed (safe public columns like Job Rank).

Epsilon Budget logic (Differential Privacy):
- Epsilon defines the privacy budget. Lower is more private.
- ε=10.0: Light privacy (e.g., preserving outcomes like hiring_decision)
- ε=1.0: Standard privacy
- ε=0.1: Strict privacy (highly sensitive outcomes)

Respond ONLY with valid JSON. No markdown, no explanation."""

_USER_PROMPT = """Column to classify:
  Name: {col_name}
  Sensitivity: {sensitivity}
  Domain: {domain}
  Sample values: {samples}
  Data type: {dtype}

Relevant compliance rules from knowledge base:
{rules_text}

Determine the required compliance action for this column.
Return JSON:
{{
  "action": "SUPPRESS" | "MASK" | "GENERALIZE" | "RETAIN_WITH_NOISE" | "RETAIN",
  "epsilon_budget": 1.0, 
  "regulation_id": "<rule ID from above e.g. HIPAA-SH-04>",
  "citation": "<exact citation e.g. §164.514(b)(2)(i)(D)>",
  "regulation_name": "<full regulation name>",
  "justification": "<one sentence explaining why this action was chosen>"
}}"""


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> Optional[dict]:
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


def _call_llm(col_name: str, sensitivity: str, domain: str,
              samples: list, dtype: str, rules_text: str) -> Optional[dict]:
    try:
        client = ollama.Client(host=settings.ollama_base_url)
        response = client.chat(
            model=settings.primary_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": _USER_PROMPT.format(
                    col_name=col_name,
                    sensitivity=sensitivity,
                    domain=domain,
                    samples=", ".join(str(v) for v in samples[:5]),
                    dtype=dtype,
                    rules_text=rules_text,
                )},
            ],
            format="json",
            options={"temperature": 0.05, "num_ctx": 3000},
        )
        return _extract_json(response["message"]["content"])
    except Exception:
        return None


def _format_rules(chunks: list[str]) -> str:
    """Format retrieved ChromaDB chunks into readable text for the prompt."""
    if not chunks:
        return "No specific rules found. Apply conservative default."
    parts = []
    for i, chunk in enumerate(chunks, 1):
        # Truncate very long chunks to save context
        truncated = chunk[:800] + "..." if len(chunk) > 800 else chunk
        parts.append(f"--- Rule {i} ---\n{truncated}")
    return "\n\n".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Main agent function
# ─────────────────────────────────────────────────────────────────────────────

def run_compliance_agent(job_id: str, profiler_output: ProfilerOutput,
                         column_stats: dict) -> CompliancePlanOutput:
    """
    Map each sensitive column to a specific compliance rule + required action.

    Args:
        job_id:          Current pipeline job ID
        profiler_output: Output from Schema Profiler Agent
        column_stats:    Column statistics (for sample values + dtype)

    Returns:
        CompliancePlanOutput with one entry per column.
    """
    log = get_logger("compliance_agent", job_id=job_id, phase="COMPLIANCE")
    plan: dict[str, CompliancePlanEntry] = {}

    for col_name, profile in profiler_output.columns.items():
        sensitivity = profile.sensitivity_class
        domain = profile.domain_context.value
        col_info = column_stats.get(col_name, {})
        samples = col_info.get("sample_values", [])
        dtype = col_info.get("dtype", "object")

        # ── SAFE columns skip RAG entirely ──────────────────────────────────
        if sensitivity == SensitivityClass.SAFE:
            plan[col_name] = _FALLBACK_RULES[SensitivityClass.SAFE]
            log.info(f"  {col_name} → RETAIN (SAFE — no RAG query needed)")
            continue

        # ── Query ChromaDB for relevant rules ────────────────────────────────
        query = f"Column: {col_name}. Values: {', '.join(str(v) for v in samples[:3])}. Domain: {domain}. Sensitivity: {sensitivity.value}"
        log.info(f"  Querying ChromaDB for: {col_name} ({sensitivity.value}, {domain})...")

        # Use FAIRNESS category only for bias-related sensitive columns
        rag_category = "PRIVACY"
        retrieved_chunks = query_collection(query, n_results=3, category_filter=rag_category)

        if not retrieved_chunks:
            log.warning(f"  No rules retrieved for {col_name} — using fallback")
            plan[col_name] = _FALLBACK_RULES[sensitivity]
            continue

        rules_text = _format_rules(retrieved_chunks)

        # ── Call LLM with retrieved rules (3 retries) ────────────────────────
        entry = None
        for attempt in range(1, 4):
            raw = _call_llm(col_name, sensitivity.value, domain, samples, dtype, rules_text)
            if raw:
                try:
                    entry = CompliancePlanEntry(**raw)
                    log.info(f"  ✅ {col_name} → {entry.action.value} ({entry.regulation_id}) [attempt {attempt}]")
                    break
                except (ValidationError, Exception) as e:
                    log.warning(f"  Validation failed attempt {attempt}: {e}")

        if entry is None:
            log.warning(f"  All attempts failed for {col_name} — using fallback {_FALLBACK_RULES[sensitivity].action.value}")
            entry = _FALLBACK_RULES[sensitivity]

        plan[col_name] = entry

    log.info(f"Compliance plan complete — {len(plan)} columns processed")
    return CompliancePlanOutput(plan=plan)
