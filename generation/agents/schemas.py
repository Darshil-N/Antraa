"""
agents/schemas.py — Pydantic output schemas for all 6 FairSynth agents.

Every agent validates its LLM output against these models before returning.
If validation fails, the retry + fallback logic is triggered.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# SHARED ENUMS
# ─────────────────────────────────────────────────────────────────────────────

class SensitivityClass(str, Enum):
    PII       = "PII"        # Personal Identifiers (name, email, SSN, phone)
    PHI       = "PHI"        # Protected Health Info (diagnosis, MRN, DOB)
    SENSITIVE = "SENSITIVE"  # Financial / protected attributes / quasi-identifiers
    SAFE      = "SAFE"       # No compliance concern


class ComplianceAction(str, Enum):
    SUPPRESS           = "SUPPRESS"            # Exclude column entirely from output
    PSEUDONYMIZE       = "PSEUDONYMIZE"        # Replace with realistic fake values (Faker)
    GENERALIZE         = "GENERALIZE"          # Bucket into ranges (age → 30-40)
    RETAIN_WITH_NOISE  = "RETAIN_WITH_NOISE"   # Keep but apply differential privacy noise
    RETAIN             = "RETAIN"              # No action needed (SAFE columns)


class DataTypeCategory(str, Enum):
    CATEGORICAL = "categorical"
    NUMERICAL   = "numerical"
    DATETIME    = "datetime"
    TEXT        = "text"
    ID          = "id"          # Unique identifier columns


class DomainContext(str, Enum):
    HEALTHCARE  = "healthcare"
    FINANCIAL   = "financial"
    HR          = "hr"
    EDUCATION   = "education"
    GENERAL     = "general"


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"


class QualityRating(str, Enum):
    EXCELLENT        = "Excellent"
    GOOD             = "Good"
    ACCEPTABLE       = "Acceptable"
    BELOW_THRESHOLD  = "Below Threshold"


class AttributeType(str, Enum):
    PROTECTED_ATTRIBUTE = "protected_attribute"
    OUTCOME             = "outcome"
    BOTH                = "both"


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 1 — SCHEMA PROFILER  (Qwen2.5:7b)
# ─────────────────────────────────────────────────────────────────────────────

class ColumnProfile(BaseModel):
    """Profile for a single column — produced by the Schema Profiler Agent."""
    sensitivity_class: SensitivityClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    data_type_category: DataTypeCategory
    domain_context: DomainContext
    reasoning: str = Field(..., min_length=5, max_length=300)

    @field_validator("confidence")
    @classmethod
    def round_confidence(cls, v: float) -> float:
        return round(v, 4)


class ProfilerOutput(BaseModel):
    """Full output of the Schema Profiler Agent — one ColumnProfile per column."""
    columns: Dict[str, ColumnProfile]

    @field_validator("columns")
    @classmethod
    def must_not_be_empty(cls, v: dict) -> dict:
        if not v:
            raise ValueError("Profiler output must contain at least one column.")
        return v


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 2 — RAG COMPLIANCE POLICY AGENT  (Qwen2.5:7b)
# ─────────────────────────────────────────────────────────────────────────────

class CompliancePlanEntry(BaseModel):
    """Compliance decision for a single column — produced by RAG Compliance Agent."""
    action: ComplianceAction
    epsilon_budget: float = Field(1.0, description="Differential privacy budget (ε). Use 0.1-1.0 for high privacy, 1.0-10.0 for utility. Only applies if action is RETAIN_WITH_NOISE.")
    regulation_id: str = Field(..., description="e.g. HIPAA-SH-04, GDPR-ART9-01, GLBA-NPI-03")
    citation: str       = Field(..., description="e.g. §164.514(b)(2)(i)")
    regulation_name: str
    justification: str  = Field(..., min_length=5, max_length=400)


class CompliancePlanOutput(BaseModel):
    """Full compliance action plan — one entry per PII/PHI/SENSITIVE column.
    SAFE columns are auto-assigned RETAIN without querying ChromaDB."""
    plan: Dict[str, CompliancePlanEntry]


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 3 — VALIDATION REPORTER  (Llama3.2:3b)
# ─────────────────────────────────────────────────────────────────────────────

class ValidationNarrativeOutput(BaseModel):
    """Human-readable validation summary for the compliance certificate."""
    overall_assessment: str   = Field(..., min_length=20)
    quality_rating: QualityRating
    column_concerns: List[str]            # Column names with KS score < min threshold
    privacy_summary: str      = Field(..., min_length=20)
    certificate_statement: str = Field(..., min_length=30)


# ─────────────────────────────────────────────────────────────────────────────
# BIAS AGENT 1 — BIAS PROFILER  (Llama3.2:3b)
# ─────────────────────────────────────────────────────────────────────────────

class AttributeDetection(BaseModel):
    """Single detected protected attribute or outcome column."""
    column_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    detected_type: AttributeType
    reasoning: str    = Field(..., min_length=5, max_length=300)

    @field_validator("confidence")
    @classmethod
    def round_confidence(cls, v: float) -> float:
        return round(v, 4)


class BiasProfilerOutput(BaseModel):
    """Output of Bias Profiler Agent — lists of detected attributes and outcomes."""
    protected_attributes: List[AttributeDetection]
    outcome_columns: List[AttributeDetection]

    @field_validator("protected_attributes", "outcome_columns")
    @classmethod
    def must_not_both_be_empty(cls, v: list) -> list:
        return v  # Emptiness validated at graph level


# ─────────────────────────────────────────────────────────────────────────────
# BIAS AGENT 2 — BIAS METRICS EXECUTOR  (No LLM — AIF360 + SciPy)
# ─────────────────────────────────────────────────────────────────────────────

class BiasFinding(BaseModel):
    """A single computed bias finding for one protected_attr × outcome combination."""
    finding_id: str                           # e.g. "gender_x_hiring_decision_01"
    protected_attribute: str
    outcome_column: str
    metric_name: str                          # DPD | EOD | DIR | SPD | CDI
    metric_value: float
    severity: SeverityLevel
    affected_groups: List[str]                # e.g. ["Female", "Male"]
    group_rates: Dict[str, float]             # {"Female": 0.39, "Male": 0.62}
    legal_threshold: Optional[float] = None   # The threshold this was compared against


class BiasMetricsOutput(BaseModel):
    """Full output of the Bias Metrics Executor — all findings."""
    findings: List[BiasFinding]
    computation_notes: List[str]   # Flags like "n<30 for group X — metric skipped"


# ─────────────────────────────────────────────────────────────────────────────
# BIAS AGENT 3 — BIAS INTERPRETER  (Llama3.2:3b)
# ─────────────────────────────────────────────────────────────────────────────

class FindingInterpretation(BaseModel):
    """Plain-English interpretation for one bias finding."""
    finding_id: str
    plain_english: str           = Field(..., min_length=30)
    legal_standard: str          = Field(..., description="e.g. EEOC 80% Rule (29 CFR Part 1607)")
    practical_implication: str   = Field(..., min_length=20)
    severity_explanation: str    = Field(..., min_length=10)


class BiasInterpreterOutput(BaseModel):
    """Full output of Bias Interpreter — one interpretation per finding + summary."""
    interpretations: List[FindingInterpretation]
    executive_summary: str = Field(..., min_length=50,
        description="1-paragraph summary for the PDF cover page.")
