"""
utils/logger.py — Structured per-job pipeline logger.

Writes to:
  1. Rich console (color-coded by agent and level)
  2. DuckDB agent_logs table (queryable)

Usage:
    from utils.logger import get_logger
    log = get_logger("profiler_agent", job_id="abc-123", phase="PROFILING")
    log.info("Classified column 'age' as PHI with confidence 0.94")
    log.warning("Confidence below 0.70 for column 'zip_code'")
    log.error("LLM returned invalid JSON — triggering retry 1/3")
"""

from __future__ import annotations

import sys
from datetime import datetime
from typing import Optional

from rich.console import Console
from rich.text import Text

# Lazy import to avoid circular dependency — logger is imported early
_console = Console(stderr=False)

# Color map: agent_name → Rich color
_AGENT_COLORS = {
    "profiler_agent":        "cyan",
    "compliance_agent":      "magenta",
    "validator_agent":       "green",
    "bias_profiler_agent":   "yellow",
    "bias_metrics_agent":    "blue",
    "bias_interpreter_agent":"bright_cyan",
    "orchestrator":          "white",
    "system":                "dim white",
}

_LEVEL_COLORS = {
    "INFO":    "bright_white",
    "WARNING": "yellow",
    "ERROR":   "red",
    "DEBUG":   "dim",
}


class PipelineLogger:
    """Structured logger bound to a job_id and phase."""

    def __init__(self, agent_name: str, job_id: str, phase: str = ""):
        self.agent_name = agent_name
        self.job_id = job_id
        self.phase = phase
        self._agent_color = _AGENT_COLORS.get(agent_name, "white")

    def _emit(self, level: str, message: str) -> None:
        ts = datetime.utcnow().strftime("%H:%M:%S")
        agent_color = self._agent_color
        level_color = _LEVEL_COLORS.get(level, "white")

        # ── Console output ──────────────────────────────────────────────────
        line = Text()
        line.append(f"[{ts}] ", style="dim")
        line.append(f"[{self.agent_name}]", style=f"bold {agent_color}")
        line.append(f" [{level}] ", style=level_color)
        line.append(message, style="white")
        _console.print(line)

        # ── DuckDB persistence ──────────────────────────────────────────────
        # Import here to avoid circular import at module load time
        try:
            from utils.duckdb_manager import db
            db.log(self.job_id, self.agent_name, message, level, self.phase)
        except Exception:
            pass  # Never let logging failures crash the pipeline

    def info(self, message: str) -> None:
        self._emit("INFO", message)

    def warning(self, message: str) -> None:
        self._emit("WARNING", message)

    def error(self, message: str) -> None:
        self._emit("ERROR", message)

    def debug(self, message: str) -> None:
        self._emit("DEBUG", message)

    def phase(self, new_phase: str) -> "PipelineLogger":
        """Return a new logger with updated phase label."""
        return PipelineLogger(self.agent_name, self.job_id, new_phase)


def get_logger(agent_name: str, job_id: str = "system",
               phase: str = "") -> PipelineLogger:
    """Factory function — the standard way to obtain a logger."""
    return PipelineLogger(agent_name, job_id, phase)
