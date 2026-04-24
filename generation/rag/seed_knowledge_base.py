"""
rag/seed_knowledge_base.py — One-time ChromaDB seeding script.

Reads all 5 knowledge base Markdown files, chunks them at rule boundaries
(each ## section = one chunk), embeds via nomic-embed-text through Ollama,
and persists to ChromaDB.

Run once:
    cd generation
    python -m rag.seed_knowledge_base

Post-seed verification is built in — script exits non-zero if checks fail.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from config import settings
from rag.embeddings import get_collection, query_collection, verify_ollama_embedding
from utils.logger import get_logger

log = get_logger("system", job_id="seed", phase="SEEDING")

# ── Category map: filename → ChromaDB metadata category ───────────────────────
_FILE_CATEGORIES: dict[str, str] = {
    "hipaa_safe_harbor.md":         "PRIVACY",
    "gdpr_special_categories.md":   "PRIVACY",
    "glba_financial_privacy.md":    "PRIVACY",
    "fairness_legal_thresholds.md": "FAIRNESS",
    "domain_constraints_library.md":"CONSTRAINT",
}


# ─────────────────────────────────────────────────────────────────────────────
# Chunking: Split Markdown by ## rule sections
# ─────────────────────────────────────────────────────────────────────────────

def _extract_rule_id(chunk: str) -> str:
    """Extract Rule ID from chunk header e.g. '## HIPAA-SH-04: ...' → 'HIPAA-SH-04'."""
    match = re.search(r"\*\*Rule ID:\*\*\s+([A-Z0-9\-]+)", chunk)
    if match:
        return match.group(1)
    # Fallback: parse from ## header
    match = re.search(r"##\s+([A-Z0-9\-]+):", chunk)
    if match:
        return match.group(1)
    return "UNKNOWN"


def chunk_markdown_file(filepath: Path) -> list[dict]:
    """
    Split a knowledge base Markdown file into rule-level chunks.

    Each chunk = one ## section (rule entry).
    Returns list of dicts: {"text": ..., "rule_id": ..., "source": ...}
    """
    text = filepath.read_text(encoding="utf-8")
    # Split on '## ' headings (each rule starts with ##)
    parts = re.split(r"\n(?=## )", text)
    chunks = []
    for part in parts:
        part = part.strip()
        if not part or part.startswith("#") and not part.startswith("##"):
            # Skip file-level H1 headers
            continue
        if len(part) < 50:
            # Skip very short fragments (blank sections, etc.)
            continue
        rule_id = _extract_rule_id(part)
        chunks.append({
            "text":    part,
            "rule_id": rule_id,
            "source":  filepath.name,
        })
    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Main seeding logic
# ─────────────────────────────────────────────────────────────────────────────

def seed(force: bool = False) -> int:
    """
    Seed ChromaDB with all knowledge base files.

    Args:
        force: If True, delete existing collection and re-seed from scratch.

    Returns:
        Number of chunks successfully added.
    """
    # ── 0. Verify Ollama embedding is responding ──────────────────────────────
    log.info("Verifying Ollama embedding endpoint...")
    if not verify_ollama_embedding():
        log.error("Ollama embedding check failed. Is Ollama running with nomic-embed-text pulled?")
        log.error("Run: ollama pull nomic-embed-text")
        return 0

    # ── 1. Get (or recreate) the collection ───────────────────────────────────
    from rag.embeddings import get_chroma_client
    client = get_chroma_client()

    if force:
        log.warning(f"Force flag set — deleting collection '{settings.chromadb_collection}'")
        try:
            client.delete_collection(settings.chromadb_collection)
        except Exception:
            pass  # Collection may not exist yet

    collection = get_collection()
    existing_count = collection.count()

    if existing_count > 0 and not force:
        log.info(
            f"Collection '{settings.chromadb_collection}' already contains "
            f"{existing_count} chunks. Skipping seed (use force=True to re-seed)."
        )
        return existing_count

    # ── 2. Process each knowledge base file ──────────────────────────────────
    kb_path = settings.knowledge_base_path
    total_added = 0

    for filename, category in _FILE_CATEGORIES.items():
        filepath = kb_path / filename
        if not filepath.exists():
            log.warning(f"Knowledge base file not found: {filepath} — skipping")
            continue

        log.info(f"Processing {filename} (category={category})...")
        chunks = chunk_markdown_file(filepath)
        log.info(f"  Found {len(chunks)} rule chunks in {filename}")

        # Batch add to ChromaDB
        documents = [c["text"] for c in chunks]
        ids       = [f"{filepath.stem}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "source":   c["source"],
                "rule_id":  c["rule_id"],
                "category": category,
            }
            for c in chunks
        ]

        try:
            collection.add(
                documents=documents,
                ids=ids,
                metadatas=metadatas,
            )
            log.info(f"  ✅ Added {len(chunks)} chunks from {filename}")
            total_added += len(chunks)
        except Exception as e:
            log.error(f"  ❌ Failed to add chunks from {filename}: {e}")

    log.info(f"Seeding complete. Total chunks in collection: {collection.count()}")
    return total_added


# ─────────────────────────────────────────────────────────────────────────────
# Post-seed verification
# ─────────────────────────────────────────────────────────────────────────────

def verify_seeding() -> bool:
    """
    Run post-seed verification queries.
    Both queries must return at least 2 chunks with non-zero results.
    """
    log.info("Running post-seed verification...")

    # Test 1: Privacy query
    privacy_results = query_collection(
        "SSN social security number healthcare dataset suppress",
        n_results=3,
        category_filter="PRIVACY",
    )
    if len(privacy_results) < 2:
        log.error(f"PRIVACY verification failed — only {len(privacy_results)} results returned")
        return False
    log.info(f"✅ PRIVACY query: {len(privacy_results)} chunks returned")

    # Test 2: Fairness query
    fairness_results = query_collection(
        "Disparate Impact Ratio legal threshold EEOC 80 percent rule employment",
        n_results=3,
        category_filter="FAIRNESS",
    )
    if len(fairness_results) < 2:
        log.error(f"FAIRNESS verification failed — only {len(fairness_results)} results returned")
        return False
    log.info(f"✅ FAIRNESS query: {len(fairness_results)} chunks returned")

    # Test 3: Constraint query
    constraint_results = query_collection(
        "credit score range valid values financial dataset",
        n_results=2,
        category_filter="CONSTRAINT",
    )
    if len(constraint_results) < 1:
        log.error(f"CONSTRAINT verification failed — only {len(constraint_results)} results returned")
        return False
    log.info(f"✅ CONSTRAINT query: {len(constraint_results)} chunks returned")

    log.info("All verification checks passed ✅")
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Seed FairSynth ChromaDB knowledge base")
    parser.add_argument("--force", action="store_true",
                        help="Delete and re-seed even if collection already exists")
    args = parser.parse_args()

    added = seed(force=args.force)

    if added == 0 and not args.force:
        # May already be seeded — just run verification
        pass

    ok = verify_seeding()
    if not ok:
        log.error("Verification failed — check Ollama and re-run with --force")
        sys.exit(1)

    log.info("Knowledge base ready ✅")
    sys.exit(0)
