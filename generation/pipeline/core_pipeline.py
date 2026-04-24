"""
pipeline/core_pipeline.py — Core FairSynth LangGraph Pipeline.

6-node state machine with human-in-the-loop approval gate:

  profiler_node → compliance_node → human_gate_node
                                          ↓ (interrupt — waits for frontend)
                                    generator_node → validator_node → packager_node → END

Human gate uses LangGraph 0.2.x interrupt() + Command(resume=...) pattern.
MemorySaver checkpointer persists state across the pause.

Usage:
    from pipeline.core_pipeline import build_core_pipeline, resume_pipeline

    graph = build_core_pipeline()

    # Start pipeline
    config = {"configurable": {"thread_id": job_id}}
    result = graph.invoke({"job_id": job_id, "file_path": path, ...}, config=config)

    # Resume after user approval
    from langgraph.types import Command
    result = graph.invoke(Command(resume=approval_payload), config=config)
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Annotated, List, Optional

import duckdb
import pandas as pd
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END
from langgraph.types import interrupt, Command
from typing_extensions import TypedDict

from agents.compliance_agent import run_compliance_agent
from agents.profiler_agent import run_profiler_agent
from agents.validator_agent import run_validator_agent
from config import settings
from synthesis.generator import run_synthesis
from utils.duckdb_manager import db
from utils.logger import get_logger

# ─────────────────────────────────────────────────────────────────────────────
# Shared State
# ─────────────────────────────────────────────────────────────────────────────

def _append(a: list, b: list) -> list:
    return a + b


class PipelineState(TypedDict):
    job_id:              str
    file_path:           str
    column_stats:        dict                    # DuckDB profiling output
    column_profiles:     Optional[dict]          # Profiler Agent output (serialized)
    compliance_plan:     Optional[dict]          # Compliance Agent output (serialized)
    approval_payload:    Optional[dict]          # Human approval decisions
    synthetic_df_path:   Optional[str]
    quality_scores:      Optional[dict]
    validation_narrative:Optional[str]
    phase:               str
    agent_logs:          Annotated[List[str], _append]
    error:               Optional[str]


# ─────────────────────────────────────────────────────────────────────────────
# DuckDB Column Profiling (Phase 2 — pre-LLM)
# ─────────────────────────────────────────────────────────────────────────────

def _profile_with_duckdb(file_path: str, job_id: str) -> dict:
    """Fast per-column statistical profiling using DuckDB SQL."""
    log = get_logger("orchestrator", job_id=job_id, phase="DUCKDB_PROFILING")
    con = duckdb.connect()

    if file_path.endswith(".parquet"):
        df = con.execute(f"SELECT * FROM read_parquet('{file_path}')").df()
    else:
        df = con.execute(f"""
            SELECT * FROM read_csv('{file_path}', header=true,
                null_padding=true, ignore_errors=true, strict_mode=false)
        """).df()

    col_stats = {}
    max_cols = settings.max_stats_columns

    for col in list(df.columns)[:max_cols]:
        series = df[col]
        stats: dict = {
            "dtype":         str(series.dtype),
            "row_count":     len(series),
            "missing_count": int(series.isna().sum()),
            "missing_pct":   round(float(series.isna().mean()) * 100, 2),
            "unique_values": int(series.nunique(dropna=True)),
            "sample_values": [str(v) for v in series.dropna().head(5).tolist()],
        }
        if pd.api.types.is_numeric_dtype(series):
            s = series.dropna()
            if not s.empty:
                stats["stats"] = {
                    "mean": round(float(s.mean()), 4),
                    "std":  round(float(s.std()), 4),
                    "min":  round(float(s.min()), 4),
                    "max":  round(float(s.max()), 4),
                    "q25":  round(float(s.quantile(0.25)), 4),
                    "q75":  round(float(s.quantile(0.75)), 4),
                }
        col_stats[col] = stats

    log.info(f"DuckDB profiling complete — {len(col_stats)} columns profiled")
    con.close()
    return col_stats


# ─────────────────────────────────────────────────────────────────────────────
# Graph Nodes
# ─────────────────────────────────────────────────────────────────────────────

def profiler_node(state: PipelineState) -> dict:
    job_id = state["job_id"]
    log = get_logger("orchestrator", job_id=job_id, phase="PROFILING")
    db.update_job_phase(job_id, "PROFILING")
    log.info("Phase 1: DuckDB statistical profiling...")

    try:
        col_stats = _profile_with_duckdb(state["file_path"], job_id)
        log.info("Phase 2: Running Schema Profiler Agent (Qwen2.5:7b)...")
        profiler_out = run_profiler_agent(job_id, col_stats)

        # Persist to DuckDB
        for col, profile in profiler_out.columns.items():
            db.upsert_column_profile(job_id, col, {
                "sensitivity_class": profile.sensitivity_class.value,
                "confidence_score":  profile.confidence,
                "domain_context":    profile.domain_context.value,
                "inferred_type":     profile.data_type_category.value,
            })

        return {
            "column_stats":    col_stats,
            "column_profiles": {k: v.model_dump() for k, v in profiler_out.columns.items()},
            "phase":           "COMPLIANCE",
            "agent_logs":      [f"[PROFILER] Classified {len(profiler_out.columns)} columns"],
        }
    except Exception as e:
        db.update_job_phase(job_id, "FAILED")
        return {"error": str(e), "phase": "FAILED", "agent_logs": [f"[PROFILER ERROR] {e}"]}


def compliance_node(state: PipelineState) -> dict:
    if state.get("error"):
        return {}
    job_id = state["job_id"]
    log = get_logger("orchestrator", job_id=job_id, phase="COMPLIANCE")
    db.update_job_phase(job_id, "COMPLIANCE")
    log.info("Phase 3: Running RAG Compliance Agent...")

    try:
        from agents.schemas import ProfilerOutput, ColumnProfile
        profiles_raw = state["column_profiles"]
        profiler_out = ProfilerOutput(columns={
            k: ColumnProfile(**v) for k, v in profiles_raw.items()
        })

        compliance_out = run_compliance_agent(job_id, profiler_out, state["column_stats"])

        # Persist compliance plan to DuckDB
        for col, entry in compliance_out.plan.items():
            db.upsert_column_profile(job_id, col, {
                "compliance_action":   entry.action.value,
                "regulation_id":       entry.regulation_id,
                "regulation_citation": entry.citation,
                "regulation_name":     entry.regulation_name,
                "justification":       entry.justification,
            })

        return {
            "compliance_plan": {k: v.model_dump() for k, v in compliance_out.plan.items()},
            "phase":           "AWAITING_APPROVAL",
            "agent_logs":      [f"[COMPLIANCE] Plan built for {len(compliance_out.plan)} columns"],
        }
    except Exception as e:
        db.update_job_phase(job_id, "FAILED")
        return {"error": str(e), "phase": "FAILED", "agent_logs": [f"[COMPLIANCE ERROR] {e}"]}


def human_gate_node(state: PipelineState) -> dict:
    """
    Pipeline pauses here using LangGraph interrupt().
    Frontend receives compliance plan and column classifications.
    Pipeline resumes when graph.invoke(Command(resume=payload)) is called.
    """
    if state.get("error"):
        return {}
    job_id = state["job_id"]
    db.update_job_phase(job_id, "AWAITING_APPROVAL")

    # Emit interrupt payload to frontend
    approval = interrupt({
        "event":           "AWAITING_APPROVAL",
        "job_id":          job_id,
        "column_profiles": state["column_profiles"],
        "compliance_plan": state["compliance_plan"],
        "column_stats":    {k: {"missing_pct": v.get("missing_pct"), "unique_values": v.get("unique_values")}
                            for k, v in state["column_stats"].items()},
    })

    # `approval` is the dict the frontend POSTs to /api/approve-plan/{job_id}
    # Shape: {col: {"action": ..., "epsilon_budget": ..., "approved": true, "override": false}}
    db.update_job_phase(job_id, "GENERATING")
    return {
        "approval_payload": approval,
        "phase":            "GENERATING",
        "agent_logs":       ["[GATE] Human approval received — resuming pipeline"],
    }


def generator_node(state: PipelineState) -> dict:
    if state.get("error"):
        return {}
    job_id = state["job_id"]
    log = get_logger("orchestrator", job_id=job_id, phase="GENERATING")
    db.update_job_phase(job_id, "GENERATING")
    log.info("Phase 4: Unloading LLMs from VRAM (SDV is CPU-only)...")

    try:
        # Load original data
        file_path = state["file_path"]
        df_original = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_parquet(file_path)

        # Build column config from approval payload (or fall back to compliance plan defaults)
        approval = state.get("approval_payload") or {}
        compliance = state.get("compliance_plan") or {}
        column_config: dict[str, dict] = {}
        for col in df_original.columns:
            if col in approval and isinstance(approval[col], dict):
                column_config[col] = approval[col]
            elif col in compliance:
                column_config[col] = {
                    "action":         compliance[col].get("action", "RETAIN"),
                    "epsilon_budget": 1.0,
                }
            else:
                column_config[col] = {"action": "RETAIN", "epsilon_budget": 1.0}

        output_dir = settings.jobs_path / job_id / "outputs"
        df_synth, quality_scores, tracker = run_synthesis(
            job_id=job_id,
            df_original=df_original,
            column_config=column_config,
            output_dir=output_dir,
        )

        synth_path = str(output_dir / "synthetic_data.csv")
        quality_scores["epsilon_summary"] = tracker

        # Persist quality scores
        db.save_quality_scores(
            job_id,
            overall=quality_scores.get("overall_quality_score", 0.0),
            ks_scores=quality_scores.get("ks_test_scores", {}),
            corr=quality_scores.get("correlation_similarity", 0.0),
            privacy_risk=tracker.get("privacy_risk_score", 0.0),
        )

        return {
            "synthetic_df_path": synth_path,
            "quality_scores":    quality_scores,
            "phase":             "VALIDATING",
            "agent_logs":        [f"[GENERATOR] Synthesis complete — quality: {quality_scores.get('overall_quality_score', 0):.1%}"],
        }
    except Exception as e:
        db.update_job_phase(job_id, "FAILED")
        return {"error": str(e), "phase": "FAILED", "agent_logs": [f"[GENERATOR ERROR] {e}"]}


def validator_node(state: PipelineState) -> dict:
    if state.get("error"):
        return {}
    job_id = state["job_id"]
    log = get_logger("orchestrator", job_id=job_id, phase="VALIDATING")
    db.update_job_phase(job_id, "VALIDATING")
    log.info("Phase 5: Running Validation Reporter Agent (Llama3.2:3b)...")

    try:
        narrative_out = run_validator_agent(
            job_id=job_id,
            quality_scores=state["quality_scores"],
            approval_payload=state.get("approval_payload") or {},
        )
        return {
            "validation_narrative": narrative_out.model_dump_json(),
            "phase":      "PACKAGING",
            "agent_logs": [f"[VALIDATOR] Quality rating: {narrative_out.quality_rating.value}"],
        }
    except Exception as e:
        return {
            "validation_narrative": json.dumps({"error": str(e)}),
            "phase":      "PACKAGING",
            "agent_logs": [f"[VALIDATOR ERROR] {e} — continuing to packaging"],
        }


def packager_node(state: PipelineState) -> dict:
    if state.get("error"):
        return {}
    job_id = state["job_id"]
    log = get_logger("orchestrator", job_id=job_id, phase="PACKAGING")
    db.update_job_phase(job_id, "PACKAGING")
    log.info("Phase 6: Packaging outputs...")

    try:
        output_dir = settings.jobs_path / job_id / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save audit trail JSON
        audit_trail = {
            "job_id":             job_id,
            "file_path":          state.get("file_path"),
            "column_profiles":    state.get("column_profiles"),
            "compliance_plan":    state.get("compliance_plan"),
            "approval_payload":   state.get("approval_payload"),
            "quality_scores":     state.get("quality_scores"),
            "validation_narrative": state.get("validation_narrative"),
        }
        audit_path = output_dir / "audit_trail.json"
        audit_path.write_text(json.dumps(audit_trail, indent=2, default=str))

        db.update_job_phase(job_id, "DONE")
        log.info(f"✅ Pipeline complete — outputs in {output_dir}")

        return {
            "phase":      "DONE",
            "agent_logs": [f"[PACKAGER] Outputs ready at {output_dir}"],
        }
    except Exception as e:
        return {"error": str(e), "phase": "FAILED", "agent_logs": [f"[PACKAGER ERROR] {e}"]}


# ─────────────────────────────────────────────────────────────────────────────
# Error routing
# ─────────────────────────────────────────────────────────────────────────────

def _route_after_profiler(state: PipelineState) -> str:
    return END if state.get("error") else "compliance"

def _route_after_compliance(state: PipelineState) -> str:
    return END if state.get("error") else "human_gate"

def _route_after_gate(state: PipelineState) -> str:
    return END if state.get("error") else "generator"

def _route_after_generator(state: PipelineState) -> str:
    return END if state.get("error") else "validator"


# ─────────────────────────────────────────────────────────────────────────────
# Graph builder
# ─────────────────────────────────────────────────────────────────────────────

def build_core_pipeline():
    """Build and compile the core FairSynth LangGraph pipeline."""
    builder = StateGraph(PipelineState)

    builder.add_node("profiler",   profiler_node)
    builder.add_node("compliance", compliance_node)
    builder.add_node("human_gate", human_gate_node)
    builder.add_node("generator",  generator_node)
    builder.add_node("validator",  validator_node)
    builder.add_node("packager",   packager_node)

    builder.set_entry_point("profiler")

    builder.add_conditional_edges("profiler",   _route_after_profiler,
                                  {"compliance": "compliance", END: END})
    builder.add_conditional_edges("compliance", _route_after_compliance,
                                  {"human_gate": "human_gate", END: END})
    builder.add_conditional_edges("human_gate", _route_after_gate,
                                  {"generator": "generator", END: END})
    builder.add_conditional_edges("generator",  _route_after_generator,
                                  {"validator": "validator", END: END})
    builder.add_edge("validator", "packager")
    builder.add_edge("packager",  END)

    return builder.compile(checkpointer=MemorySaver())


# ─────────────────────────────────────────────────────────────────────────────
# Public helpers
# ─────────────────────────────────────────────────────────────────────────────

_graph = None

def get_core_pipeline():
    """Singleton compiled graph."""
    global _graph
    if _graph is None:
        _graph = build_core_pipeline()
    return _graph


def start_pipeline(job_id: str, file_path: str, session_id: str = "") -> dict:
    """Start the pipeline (runs until human_gate interrupt)."""
    graph = get_core_pipeline()
    config = {"configurable": {"thread_id": job_id}}
    initial_state = PipelineState(
        job_id=job_id, file_path=file_path,
        column_stats={}, column_profiles=None, compliance_plan=None,
        approval_payload=None, synthetic_df_path=None,
        quality_scores=None, validation_narrative=None,
        phase="STARTED", agent_logs=[], error=None,
    )
    return graph.invoke(initial_state, config=config)


def resume_pipeline(job_id: str, approval_payload: dict) -> dict:
    """Resume the pipeline after human approval."""
    graph = get_core_pipeline()
    config = {"configurable": {"thread_id": job_id}}
    return graph.invoke(Command(resume=approval_payload), config=config)


def get_pipeline_state(job_id: str) -> Optional[dict]:
    """Read current checkpointed state."""
    graph = get_core_pipeline()
    config = {"configurable": {"thread_id": job_id}}
    state = graph.get_state(config)
    return dict(state.values) if state else None
