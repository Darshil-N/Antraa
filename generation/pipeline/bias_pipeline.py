"""
pipeline/bias_pipeline.py — Bias Audit LangGraph Pipeline (separate graph).

4-node state machine with human confirmation gate:

  bias_profiler_node → attribute_gate_node (interrupt)
                              ↓ (user confirms/overrides attributes)
                       metrics_node → interpreter_node → END

Completely independent from core_pipeline.py.
Can be triggered on any dataset (original or synthetic).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, List, Optional

import pandas as pd
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END
from langgraph.types import interrupt, Command
from typing_extensions import TypedDict

from agents.bias_interpreter_agent import run_bias_interpreter_agent
from agents.bias_metrics_agent import run_bias_metrics_agent
from agents.bias_profiler_agent import run_bias_profiler_agent
from config import settings
from utils.duckdb_manager import db
from utils.logger import get_logger


# ─────────────────────────────────────────────────────────────────────────────
# State
# ─────────────────────────────────────────────────────────────────────────────

def _append(a: list, b: list) -> list:
    return a + b


class BiasAuditState(TypedDict):
    audit_id:             str
    file_path:            str
    source_job_id:        Optional[str]       # If linked to a synthesis job
    column_stats:         dict
    detected_attributes:  Optional[list]      # BiasProfilerOutput — serialized
    detected_outcomes:    Optional[list]
    confirmed_attributes: Optional[list[str]] # Human-confirmed column names
    confirmed_outcomes:   Optional[list[str]]
    bias_findings:        Optional[list]      # BiasMetricsOutput — serialized
    interpretation:       Optional[str]       # BiasInterpreterOutput JSON
    phase:                str
    agent_logs:           Annotated[List[str], _append]
    error:                Optional[str]


# ─────────────────────────────────────────────────────────────────────────────
# DuckDB column profiling (reused from core pipeline)
# ─────────────────────────────────────────────────────────────────────────────

def _quick_profile(df: pd.DataFrame) -> dict:
    """Fast column stats for the bias profiler prompt."""
    stats = {}
    for col in df.columns:
        s = df[col]
        stats[col] = {
            "dtype":         str(s.dtype),
            "unique_values": int(s.nunique()),
            "sample_values": [str(v) for v in s.dropna().head(5).tolist()],
            "missing_pct":   round(float(s.isna().mean()) * 100, 2),
        }
    return stats


# ─────────────────────────────────────────────────────────────────────────────
# Graph Nodes
# ─────────────────────────────────────────────────────────────────────────────

def bias_profiler_node(state: BiasAuditState) -> dict:
    audit_id = state["audit_id"]
    log = get_logger("orchestrator", job_id=audit_id, phase="BIAS_PROFILING")
    db.update_job_phase(audit_id, "BIAS_PROFILING")

    try:
        file_path = state["file_path"]
        df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_parquet(file_path)
        col_stats = _quick_profile(df)
        log.info(f"Running Bias Profiler Agent on {len(col_stats)} columns...")
        profiler_out = run_bias_profiler_agent(audit_id, col_stats)

        return {
            "column_stats":       col_stats,
            "detected_attributes": [a.model_dump() for a in profiler_out.protected_attributes],
            "detected_outcomes":   [o.model_dump() for o in profiler_out.outcome_columns],
            "phase":               "AWAITING_CONFIRMATION",
            "agent_logs":          [
                f"[BIAS_PROFILER] Detected {len(profiler_out.protected_attributes)} protected attrs, "
                f"{len(profiler_out.outcome_columns)} outcomes"
            ],
        }
    except Exception as e:
        return {"error": str(e), "phase": "FAILED", "agent_logs": [f"[BIAS_PROFILER ERROR] {e}"]}


def attribute_gate_node(state: BiasAuditState) -> dict:
    """
    Human confirmation gate.
    Frontend displays detected attributes and outcomes for user to confirm/override.
    Interrupt payload sent to frontend; confirmed selections returned on resume.
    """
    if state.get("error"):
        return {}
    audit_id = state["audit_id"]
    db.update_job_phase(audit_id, "AWAITING_CONFIRMATION")

    confirmation = interrupt({
        "event":               "AWAITING_ATTRIBUTE_CONFIRMATION",
        "audit_id":            audit_id,
        "detected_attributes": state["detected_attributes"],
        "detected_outcomes":   state["detected_outcomes"],
        "column_stats":        {k: v["sample_values"] for k, v in state["column_stats"].items()},
    })

    # confirmation shape:
    # {
    #   "confirmed_attributes": ["gender", "race"],
    #   "confirmed_outcomes":   ["hired"]
    # }
    confirmed_attrs   = confirmation.get("confirmed_attributes", [])
    confirmed_outcomes = confirmation.get("confirmed_outcomes",  [])

    if not confirmed_attrs or not confirmed_outcomes:
        return {
            "error": "No protected attributes or outcome columns confirmed by user.",
            "phase": "FAILED",
            "agent_logs": ["[GATE] Confirmation cancelled — no attributes selected"],
        }

    db.update_job_phase(audit_id, "BIAS_COMPUTING")
    return {
        "confirmed_attributes": confirmed_attrs,
        "confirmed_outcomes":   confirmed_outcomes,
        "phase":                "BIAS_COMPUTING",
        "agent_logs":           [f"[GATE] Confirmed: attrs={confirmed_attrs}, outcomes={confirmed_outcomes}"],
    }


def metrics_node(state: BiasAuditState) -> dict:
    if state.get("error"):
        return {}
    audit_id = state["audit_id"]
    log = get_logger("orchestrator", job_id=audit_id, phase="BIAS_METRICS")
    db.update_job_phase(audit_id, "BIAS_COMPUTING")

    try:
        file_path = state["file_path"]
        df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_parquet(file_path)

        metrics_out = run_bias_metrics_agent(
            audit_id=audit_id,
            df=df,
            confirmed_attributes=state["confirmed_attributes"],
            confirmed_outcomes=state["confirmed_outcomes"],
        )

        # Persist to DuckDB
        for finding in metrics_out.findings:
            db.save_bias_finding(audit_id, {
                "source_job_id":      state.get("source_job_id"),
                "filename":           Path(file_path).name,
                "finding_id":         finding.finding_id,
                "protected_attribute":finding.protected_attribute,
                "outcome_column":     finding.outcome_column,
                "metric_name":        finding.metric_name,
                "metric_value":       finding.metric_value,
                "severity":           finding.severity.value,
                "affected_groups":    finding.affected_groups,
                "group_rates":        finding.group_rates,
                "legal_threshold":    finding.legal_threshold,
            })

        log.info(f"✅ Bias metrics: {len(metrics_out.findings)} findings ({len(metrics_out.computation_notes)} notes)")
        return {
            "bias_findings": [f.model_dump() for f in metrics_out.findings],
            "phase":         "BIAS_INTERPRETING",
            "agent_logs":    [f"[METRICS] {len(metrics_out.findings)} findings computed"],
        }
    except Exception as e:
        return {"error": str(e), "phase": "FAILED", "agent_logs": [f"[METRICS ERROR] {e}"]}


def interpreter_node(state: BiasAuditState) -> dict:
    if state.get("error"):
        return {}
    audit_id = state["audit_id"]
    log = get_logger("orchestrator", job_id=audit_id, phase="BIAS_INTERPRETING")
    db.update_job_phase(audit_id, "BIAS_INTERPRETING")

    try:
        from agents.schemas import BiasFinding, SeverityLevel
        findings = [BiasFinding(**f) for f in (state["bias_findings"] or [])]

        interp_out = run_bias_interpreter_agent(audit_id, findings)

        # Update narrations in DuckDB
        for interp in interp_out.interpretations:
            db.update_bias_narration(audit_id, interp.finding_id, interp.plain_english)

        # Save output package
        output_dir = settings.bias_jobs_path / audit_id / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)

        report_data = {
            "audit_id":         audit_id,
            "executive_summary": interp_out.executive_summary,
            "findings":         state["bias_findings"],
            "interpretations":  [i.model_dump() for i in interp_out.interpretations],
            "confirmed_attributes": state["confirmed_attributes"],
            "confirmed_outcomes":   state["confirmed_outcomes"],
        }
        (output_dir / "bias_findings.json").write_text(
            json.dumps(report_data, indent=2, default=str)
        )

        db.update_job_phase(audit_id, "DONE")
        log.info(f"✅ Bias audit complete — outputs in {output_dir}")

        return {
            "interpretation": json.dumps(report_data, default=str),
            "phase":          "DONE",
            "agent_logs":     ["[INTERPRETER] Bias audit report generated"],
        }
    except Exception as e:
        db.update_job_phase(audit_id, "FAILED")
        return {"error": str(e), "phase": "FAILED", "agent_logs": [f"[INTERPRETER ERROR] {e}"]}


# ─────────────────────────────────────────────────────────────────────────────
# Routing
# ─────────────────────────────────────────────────────────────────────────────

def _route(next_node: str):
    def _fn(state: BiasAuditState) -> str:
        return END if state.get("error") else next_node
    return _fn


# ─────────────────────────────────────────────────────────────────────────────
# Graph builder
# ─────────────────────────────────────────────────────────────────────────────

def build_bias_pipeline():
    builder = StateGraph(BiasAuditState)

    builder.add_node("bias_profiler",    bias_profiler_node)
    builder.add_node("attribute_gate",   attribute_gate_node)
    builder.add_node("metrics",          metrics_node)
    builder.add_node("interpreter",      interpreter_node)

    builder.set_entry_point("bias_profiler")
    builder.add_conditional_edges("bias_profiler",  _route("attribute_gate"),
                                  {"attribute_gate": "attribute_gate", END: END})
    builder.add_conditional_edges("attribute_gate", _route("metrics"),
                                  {"metrics": "metrics", END: END})
    builder.add_conditional_edges("metrics",        _route("interpreter"),
                                  {"interpreter": "interpreter", END: END})
    builder.add_edge("interpreter", END)

    return builder.compile(checkpointer=MemorySaver())


# ─────────────────────────────────────────────────────────────────────────────
# Public helpers
# ─────────────────────────────────────────────────────────────────────────────

_bias_graph = None

def get_bias_pipeline():
    global _bias_graph
    if _bias_graph is None:
        _bias_graph = build_bias_pipeline()
    return _bias_graph


def start_bias_audit(audit_id: str, file_path: str,
                     source_job_id: Optional[str] = None) -> dict:
    graph = get_bias_pipeline()
    config = {"configurable": {"thread_id": audit_id}}
    initial = BiasAuditState(
        audit_id=audit_id, file_path=file_path, source_job_id=source_job_id,
        column_stats={}, detected_attributes=None, detected_outcomes=None,
        confirmed_attributes=None, confirmed_outcomes=None,
        bias_findings=None, interpretation=None,
        phase="STARTED", agent_logs=[], error=None,
    )
    return graph.invoke(initial, config=config)


def confirm_bias_attributes(audit_id: str, confirmed_attributes: list[str],
                            confirmed_outcomes: list[str]) -> dict:
    graph = get_bias_pipeline()
    config = {"configurable": {"thread_id": audit_id}}
    return graph.invoke(Command(resume={
        "confirmed_attributes": confirmed_attributes,
        "confirmed_outcomes":   confirmed_outcomes,
    }), config=config)


def get_bias_state(audit_id: str) -> Optional[dict]:
    graph = get_bias_pipeline()
    config = {"configurable": {"thread_id": audit_id}}
    state = graph.get_state(config)
    return dict(state.values) if state else None
