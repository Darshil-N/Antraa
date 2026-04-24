"""
rag/knowledge_watcher.py — Auto-reseeds ChromaDB when new/updated .md files
are detected in the knowledge_base/ folder.

Design philosophy:
  - Privacy-first: NO external HTTP calls, NO web scraping.
  - Human-in-the-loop for rule updates: a human edits/adds an .md file,
    the watcher auto-ingests it. Wrong rules are never auto-pulled from internet.
  - Regulations change slowly (HIPAA: 2012, GDPR: 2018, GLBA Safeguards: 2023).
    A folder-watch model is the right granularity.

Usage (run as a background process alongside the API):
    python -m rag.knowledge_watcher

Or call programmatically:
    from rag.knowledge_watcher import refresh_if_updated
    refresh_if_updated()   # Call at startup — fast if nothing changed
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

from config import settings
from utils.logger import get_logger

log = get_logger("system", job_id="kb_watcher", phase="KB_WATCH")

# Stores last-seen file hashes between checks
_HASH_CACHE_FILE = Path(settings.chromadb_path) / "kb_hashes.json"


# ─────────────────────────────────────────────────────────────────────────────
# Hash utilities
# ─────────────────────────────────────────────────────────────────────────────

def _file_hash(path: Path) -> str:
    """MD5 hash of file contents — used to detect changes."""
    return hashlib.md5(path.read_bytes()).hexdigest()


def _load_hash_cache() -> dict[str, str]:
    if _HASH_CACHE_FILE.exists():
        return json.loads(_HASH_CACHE_FILE.read_text())
    return {}


def _save_hash_cache(cache: dict[str, str]) -> None:
    _HASH_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    _HASH_CACHE_FILE.write_text(json.dumps(cache, indent=2))


# ─────────────────────────────────────────────────────────────────────────────
# Core refresh logic
# ─────────────────────────────────────────────────────────────────────────────

def refresh_if_updated() -> bool:
    """
    Compare current .md file hashes against cached hashes.
    If any file is new or changed, re-seed those files only (incremental).

    Returns True if any update was applied.
    """
    kb_path = settings.knowledge_base_path
    md_files = list(kb_path.glob("*.md"))

    if not md_files:
        log.warning("No .md files found in knowledge_base/ — nothing to refresh.")
        return False

    old_cache = _load_hash_cache()
    new_cache = {}
    changed_files: list[Path] = []

    for f in md_files:
        h = _file_hash(f)
        new_cache[f.name] = h
        if old_cache.get(f.name) != h:
            changed_files.append(f)

    if not changed_files:
        log.info("Knowledge base is up to date — no changes detected.")
        return False

    log.info(f"Detected {len(changed_files)} changed/new file(s): {[f.name for f in changed_files]}")

    # Incremental re-seed: only re-add chunks from changed files
    _reseed_files(changed_files)
    _save_hash_cache(new_cache)
    return True


def _reseed_files(files: list[Path]) -> None:
    """Remove existing chunks from changed files and re-add them."""
    from rag.embeddings import get_collection
    from rag.seed_knowledge_base import chunk_markdown_file, _FILE_CATEGORIES

    collection = get_collection()

    for filepath in files:
        category = _FILE_CATEGORIES.get(filepath.name, "PRIVACY")
        stem = filepath.stem

        # Delete existing chunks for this file
        try:
            existing = collection.get(where={"source": filepath.name})
            if existing["ids"]:
                collection.delete(ids=existing["ids"])
                log.info(f"Removed {len(existing['ids'])} old chunks from {filepath.name}")
        except Exception as e:
            log.warning(f"Could not delete old chunks for {filepath.name}: {e}")

        # Re-add fresh chunks
        chunks = chunk_markdown_file(filepath)
        if not chunks:
            log.warning(f"No chunks parsed from {filepath.name} — skipping.")
            continue

        collection.add(
            documents=[c["text"] for c in chunks],
            ids=[f"{stem}_{i}" for i in range(len(chunks))],
            metadatas=[{"source": filepath.name, "rule_id": c["rule_id"], "category": category} for c in chunks],
        )
        log.info(f"✅ Re-seeded {len(chunks)} chunks from {filepath.name}")


# ─────────────────────────────────────────────────────────────────────────────
# Watchdog-based continuous file watcher
# ─────────────────────────────────────────────────────────────────────────────

def watch_continuously(poll_interval_seconds: int = 30) -> None:
    """
    Poll the knowledge_base/ folder every N seconds.
    Triggers incremental re-seed when any .md file changes.

    Uses simple polling (no OS-level fs events) to stay cross-platform.
    """
    log.info(f"Starting knowledge base watcher (poll every {poll_interval_seconds}s)...")
    log.info(f"Watching: {settings.knowledge_base_path.resolve()}")
    log.info("Drop or edit .md files in knowledge_base/ to trigger automatic re-seeding.")

    while True:
        try:
            updated = refresh_if_updated()
            if updated:
                log.info("Knowledge base updated and re-seeded ✅")
        except Exception as e:
            log.error(f"Watcher error: {e}")
        time.sleep(poll_interval_seconds)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true",
                        help="Check once and exit (for startup checks)")
    parser.add_argument("--interval", type=int, default=30,
                        help="Poll interval in seconds (default: 30)")
    args = parser.parse_args()

    if args.once:
        updated = refresh_if_updated()
        print("Updated." if updated else "No changes.")
    else:
        watch_continuously(poll_interval_seconds=args.interval)
