"""
rag/embeddings.py — Ollama-backed embedding function for ChromaDB.

Uses `nomic-embed-text` model served by local Ollama.
No sentence-transformers dependency — single inference server for everything.

Embedding dimensions: 768 (nomic-embed-text default)
"""

from __future__ import annotations

from typing import List

import chromadb
import chromadb.utils.embedding_functions as ef
import ollama

from config import settings
from utils.logger import get_logger

log = get_logger("system", job_id="rag_setup")


# ─────────────────────────────────────────────────────────────────────────────
# Custom ChromaDB EmbeddingFunction backed by Ollama
# ─────────────────────────────────────────────────────────────────────────────

class OllamaEmbeddingFunction(chromadb.EmbeddingFunction):
    """
    Wraps Ollama's embedding endpoint as a ChromaDB-compatible EmbeddingFunction.

    Pass this to collection.get_or_create_collection() so that
    collection.add(documents=[...]) handles embeddings automatically.
    """

    def __init__(self, model: str = None, base_url: str = None):
        self.model = model or settings.embedding_model
        self.client = ollama.Client(host=base_url or settings.ollama_base_url)

    def __call__(self, input: List[str]) -> List[List[float]]:
        embeddings = []
        for text in input:
            response = self.client.embeddings(model=self.model, prompt=text)
            embeddings.append(response["embedding"])
        return embeddings

    def embed_single(self, text: str) -> List[float]:
        """Convenience method for single-text embedding (used in RAG query)."""
        response = self.client.embeddings(model=self.model, prompt=text)
        return response["embedding"]


# ─────────────────────────────────────────────────────────────────────────────
# ChromaDB client + collection factory
# ─────────────────────────────────────────────────────────────────────────────

_chroma_client: chromadb.PersistentClient | None = None
_embed_fn: OllamaEmbeddingFunction | None = None


def get_chroma_client() -> chromadb.PersistentClient:
    """Return (or create) the singleton ChromaDB persistent client."""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=str(settings.chromadb_path_obj)
        )
    return _chroma_client


def get_embedding_function() -> OllamaEmbeddingFunction:
    """Return (or create) the singleton embedding function."""
    global _embed_fn
    if _embed_fn is None:
        _embed_fn = OllamaEmbeddingFunction()
    return _embed_fn


def get_collection() -> chromadb.Collection:
    """
    Return the FairSynth compliance knowledge base collection.
    Creates it if it doesn't exist yet.
    Raises RuntimeError if ChromaDB is accessible but Ollama is not.
    """
    client = get_chroma_client()
    embed_fn = get_embedding_function()
    try:
        collection = client.get_or_create_collection(
            name=settings.chromadb_collection,
            embedding_function=embed_fn,
            metadata={"hnsw:space": "cosine"},
        )
        return collection
    except Exception as e:
        raise RuntimeError(
            f"Failed to initialise ChromaDB collection: {e}\n"
            "Ensure Ollama is running and 'nomic-embed-text' is pulled."
        ) from e


def query_collection(query_text: str, n_results: int = 3,
                     category_filter: str | None = None) -> List[str]:
    """
    Semantic query against the knowledge base.

    Args:
        query_text:      Free-form query (column name + samples + domain context)
        n_results:       Top-N chunks to return
        category_filter: "PRIVACY" | "FAIRNESS" | "CONSTRAINT" | None (no filter)

    Returns:
        List of document chunk strings (top-N most relevant)
    """
    collection = get_collection()
    where = {"category": category_filter} if category_filter else None

    results = collection.query(
        query_texts=[query_text],
        n_results=n_results,
        where=where,
        include=["documents", "metadatas", "distances"],
    )
    docs = results.get("documents", [[]])[0]
    return docs


def verify_ollama_embedding() -> bool:
    """
    Health check: confirm nomic-embed-text is responding.
    Called during cold-start health check.
    """
    try:
        embed_fn = get_embedding_function()
        vec = embed_fn.embed_single("test health check")
        assert len(vec) > 0
        log.info(f"nomic-embed-text OK — embedding dim: {len(vec)}")
        return True
    except Exception as e:
        log.error(f"Embedding health check failed: {e}")
        return False
