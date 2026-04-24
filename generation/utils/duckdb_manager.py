"""
utils/duckdb_manager.py — DuckDB schema + all read/write operations.

Single responsibility: ALL database interaction lives here.
No agent or pipeline node writes to DuckDB directly.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import duckdb

from config import settings


# ─────────────────────────────────────────────────────────────────────────────
# DDL — Table definitions
# ─────────────────────────────────────────────────────────────────────────────

_DDL = """
-- Core job tracking
CREATE TABLE IF NOT EXISTS jobs (
    job_id           VARCHAR PRIMARY KEY,
    session_id       VARCHAR,
    job_type         VARCHAR NOT NULL CHECK (job_type IN ('SYNTHESIS', 'BIAS_AUDIT')),
    filename         VARCHAR,
    file_size_bytes  BIGINT,
    upload_timestamp TIMESTAMP,
    current_phase    VARCHAR NOT NULL DEFAULT 'UPLOADED',
    created_at       TIMESTAMP DEFAULT current_timestamp,
    updated_at       TIMESTAMP DEFAULT current_timestamp
);

-- Per-column classification + compliance decisions
CREATE TABLE IF NOT EXISTS column_profiles (
    job_id               VARCHAR NOT NULL,
    column_name          VARCHAR NOT NULL,
    inferred_type        VARCHAR,
    sensitivity_class    VARCHAR,
    confidence_score     DOUBLE,
    domain_context       VARCHAR,
    compliance_action    VARCHAR,
    regulation_id        VARCHAR,
    regulation_citation  VARCHAR,
    regulation_name      VARCHAR,
    justification        VARCHAR,
    user_override        BOOLEAN DEFAULT FALSE,
    user_override_value  VARCHAR,
    approved             BOOLEAN DEFAULT FALSE,
    epsilon_budget       DOUBLE DEFAULT 1.0,
    PRIMARY KEY (job_id, column_name)
);

-- Bias audit results (one row per metric per finding)
CREATE TABLE IF NOT EXISTS bias_audit_results (
    audit_id             VARCHAR NOT NULL,
    source_job_id        VARCHAR,
    filename             VARCHAR,
    finding_id           VARCHAR,
    protected_attribute  VARCHAR,
    outcome_column       VARCHAR,
    metric_name          VARCHAR,
    metric_value         DOUBLE,
    severity             VARCHAR,
    affected_groups      VARCHAR,   -- JSON array stored as text
    group_rates          VARCHAR,   -- JSON object stored as text
    legal_threshold      DOUBLE,
    interpreter_narration VARCHAR,
    computed_at          TIMESTAMP DEFAULT current_timestamp
);

-- SDMetrics quality scores
CREATE TABLE IF NOT EXISTS quality_scores (
    job_id                VARCHAR PRIMARY KEY,
    overall_quality_score DOUBLE,
    ks_test_scores        VARCHAR,  -- JSON object
    correlation_similarity DOUBLE,
    privacy_risk_score    DOUBLE,
    generated_at          TIMESTAMP DEFAULT current_timestamp
);

-- Streaming agent logs (append-only)
CREATE TABLE IF NOT EXISTS agent_logs (
    id          INTEGER,
    job_id      VARCHAR NOT NULL,
    agent_name  VARCHAR,
    log_level   VARCHAR DEFAULT 'INFO',
    message     VARCHAR,
    phase       VARCHAR,
    timestamp   TIMESTAMP DEFAULT current_timestamp
);

-- Data destruction audit trail (permanent)
CREATE TABLE IF NOT EXISTS audit_destruction_log (
    job_id              VARCHAR NOT NULL,
    destruction_trigger VARCHAR,
    destruction_timestamp TIMESTAMP DEFAULT current_timestamp,
    files_destroyed     VARCHAR   -- JSON array
);
"""


# ─────────────────────────────────────────────────────────────────────────────
# Connection manager
# ─────────────────────────────────────────────────────────────────────────────

class DuckDBManager:
    """Thread-safe DuckDB connection wrapper with schema auto-init."""

    def __init__(self, db_path: Optional[Path] = None):
        self._db_path = str(db_path or settings.duckdb_path_obj)
        self._con: Optional[duckdb.DuckDBPyConnection] = None

    @property
    def con(self) -> duckdb.DuckDBPyConnection:
        if self._con is None:
            self._con = duckdb.connect(self._db_path)
            self._con.execute(_DDL)
        return self._con

    def close(self):
        if self._con:
            self._con.close()
            self._con = None

    # ── Jobs ─────────────────────────────────────────────────────────────────

    def create_job(self, job_id: str, session_id: str, job_type: str,
                   filename: str, file_size_bytes: int) -> None:
        self.con.execute("""
            INSERT INTO jobs (job_id, session_id, job_type, filename, file_size_bytes, upload_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [job_id, session_id, job_type, filename, file_size_bytes, datetime.utcnow()])

    def update_job_phase(self, job_id: str, phase: str) -> None:
        self.con.execute("""
            UPDATE jobs SET current_phase = ?, updated_at = ?
            WHERE job_id = ?
        """, [phase, datetime.utcnow(), job_id])

    def get_job(self, job_id: str) -> Optional[dict]:
        row = self.con.execute(
            "SELECT * FROM jobs WHERE job_id = ?", [job_id]
        ).fetchone()
        if row is None:
            return None
        cols = [d[0] for d in self.con.description]
        return dict(zip(cols, row))

    # ── Column Profiles ───────────────────────────────────────────────────────

    def upsert_column_profile(self, job_id: str, col: str, data: dict) -> None:
        """Insert or replace a column profile row."""
        self.con.execute("""
            INSERT OR REPLACE INTO column_profiles
              (job_id, column_name, inferred_type, sensitivity_class, confidence_score,
               domain_context, compliance_action, regulation_id, regulation_citation,
               regulation_name, justification, epsilon_budget)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            job_id, col,
            data.get("inferred_type"),
            data.get("sensitivity_class"),
            data.get("confidence_score"),
            data.get("domain_context"),
            data.get("compliance_action"),
            data.get("regulation_id"),
            data.get("regulation_citation"),
            data.get("regulation_name"),
            data.get("justification"),
            data.get("epsilon_budget", 1.0),
        ])

    def apply_user_approval(self, job_id: str, col: str,
                            override: bool, override_value: Optional[str],
                            approved: bool, epsilon: float) -> None:
        self.con.execute("""
            UPDATE column_profiles
            SET user_override = ?, user_override_value = ?,
                approved = ?, epsilon_budget = ?
            WHERE job_id = ? AND column_name = ?
        """, [override, override_value, approved, epsilon, job_id, col])

    def get_column_profiles(self, job_id: str) -> list[dict]:
        rows = self.con.execute(
            "SELECT * FROM column_profiles WHERE job_id = ?", [job_id]
        ).fetchall()
        cols = [d[0] for d in self.con.description]
        return [dict(zip(cols, r)) for r in rows]

    # ── Quality Scores ────────────────────────────────────────────────────────

    def save_quality_scores(self, job_id: str, overall: float,
                            ks_scores: dict, corr: float, privacy_risk: float) -> None:
        self.con.execute("""
            INSERT OR REPLACE INTO quality_scores
              (job_id, overall_quality_score, ks_test_scores, correlation_similarity, privacy_risk_score)
            VALUES (?, ?, ?, ?, ?)
        """, [job_id, overall, json.dumps(ks_scores), corr, privacy_risk])

    # ── Bias Audit Results ────────────────────────────────────────────────────

    def save_bias_finding(self, audit_id: str, finding: dict) -> None:
        self.con.execute("""
            INSERT INTO bias_audit_results
              (audit_id, source_job_id, filename, finding_id, protected_attribute,
               outcome_column, metric_name, metric_value, severity,
               affected_groups, group_rates, legal_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            audit_id,
            finding.get("source_job_id"),
            finding.get("filename"),
            finding.get("finding_id"),
            finding.get("protected_attribute"),
            finding.get("outcome_column"),
            finding.get("metric_name"),
            finding.get("metric_value"),
            finding.get("severity"),
            json.dumps(finding.get("affected_groups", [])),
            json.dumps(finding.get("group_rates", {})),
            finding.get("legal_threshold"),
        ])

    def update_bias_narration(self, audit_id: str, finding_id: str, narration: str) -> None:
        self.con.execute("""
            UPDATE bias_audit_results
            SET interpreter_narration = ?
            WHERE audit_id = ? AND finding_id = ?
        """, [narration, audit_id, finding_id])

    # ── Agent Logs ────────────────────────────────────────────────────────────

    def log(self, job_id: str, agent: str, message: str,
            level: str = "INFO", phase: str = "") -> None:
        self.con.execute("""
            INSERT INTO agent_logs (job_id, agent_name, log_level, message, phase, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [job_id, agent, level, message, phase, datetime.utcnow()])

    def get_logs(self, job_id: str, limit: int = 200) -> list[dict]:
        rows = self.con.execute("""
            SELECT agent_name, log_level, message, phase, timestamp
            FROM agent_logs WHERE job_id = ?
            ORDER BY timestamp DESC LIMIT ?
        """, [job_id, limit]).fetchall()
        return [{"agent": r[0], "level": r[1], "message": r[2],
                 "phase": r[3], "ts": str(r[4])} for r in rows]

    # ── Destruction Audit ─────────────────────────────────────────────────────

    def log_destruction(self, job_id: str, trigger: str, files: list[str]) -> None:
        self.con.execute("""
            INSERT INTO audit_destruction_log (job_id, destruction_trigger, files_destroyed)
            VALUES (?, ?, ?)
        """, [job_id, trigger, json.dumps(files)])


# ── Module-level singleton ────────────────────────────────────────────────────
db = DuckDBManager()
