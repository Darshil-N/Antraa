"""
config.py — Central configuration for the FairSynth generation pipeline.

All settings are loaded from environment variables (via .env file).
Import `settings` anywhere in the project to access configuration.
"""

from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Ollama ──────────────────────────────────────────────────────────────
    ollama_base_url: str = Field("http://localhost:11434", alias="OLLAMA_BASE_URL")

    # Models — pulled one-time with: ollama pull <name>
    primary_model: str = Field("qwen2.5", alias="PRIMARY_MODEL")
    secondary_model: str = Field("llama3.2", alias="SECONDARY_MODEL")
    embedding_model: str = Field("nomic-embed-text", alias="EMBEDDING_MODEL")

    # ── ChromaDB ────────────────────────────────────────────────────────────
    chromadb_path: str = Field("./data/chromadb", alias="CHROMADB_PATH")
    chromadb_collection: str = Field("fairsynth_compliance", alias="CHROMADB_COLLECTION")

    # ── Storage ─────────────────────────────────────────────────────────────
    jobs_dir: str = Field("./data/jobs", alias="JOBS_DIR")
    bias_jobs_dir: str = Field("./data/bias_jobs", alias="BIAS_JOBS_DIR")
    knowledge_base_dir: str = Field("./knowledge_base", alias="KNOWLEDGE_BASE_DIR")

    # ── DuckDB ──────────────────────────────────────────────────────────────
    duckdb_path: str = Field("./data/fairsynth.duckdb", alias="DUCKDB_PATH")

    # ── Pipeline ────────────────────────────────────────────────────────────
    max_upload_size_mb: int = Field(500, alias="MAX_UPLOAD_SIZE_MB")
    max_stats_columns: int = Field(100, alias="MAX_STATS_COLUMNS")
    llm_timeout_seconds: int = Field(60, alias="LLM_TIMEOUT_SECONDS")
    llm_max_retries: int = Field(3, alias="LLM_MAX_RETRIES")
    default_epsilon_budget: float = Field(10.0, alias="DEFAULT_EPSILON_BUDGET")

    # ── Quality thresholds ───────────────────────────────────────────────────
    min_ks_score: float = Field(0.85, alias="MIN_KS_SCORE")
    min_quality_score: float = Field(0.80, alias="MIN_QUALITY_SCORE")

    model_config = {"env_file": ".env", "populate_by_name": True}

    # ── Derived path helpers ─────────────────────────────────────────────────
    @property
    def jobs_path(self) -> Path:
        p = Path(self.jobs_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def bias_jobs_path(self) -> Path:
        p = Path(self.bias_jobs_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def chromadb_path_obj(self) -> Path:
        p = Path(self.chromadb_path)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def duckdb_path_obj(self) -> Path:
        Path(self.duckdb_path).parent.mkdir(parents=True, exist_ok=True)
        return Path(self.duckdb_path)

    @property
    def knowledge_base_path(self) -> Path:
        return Path(self.knowledge_base_dir)


# ── Singleton instance ───────────────────────────────────────────────────────
settings = Settings()
