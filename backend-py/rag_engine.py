"""
RAG Engine — Pinecone-backed retrieval for few-shot context injection.
"""

import os
import logging
import asyncio
from typing import Optional
from pinecone import Pinecone, ServerlessSpec
from groq_client import get_embedding
from knowledge_base import ALL_ENTRIES

logger = logging.getLogger(__name__)

_pinecone_index = None
_kb_indexed = False

INDEX_NAME = os.getenv("PINECONE_INDEX", "qa-evaluator")
EMBEDDING_DIM = int(os.getenv("PINECONE_DIMENSION", "768"))


def _get_index():
    global _pinecone_index
    if _pinecone_index is None:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise RuntimeError("PINECONE_API_KEY is not configured")
        pc = Pinecone(api_key=api_key)

        # Create index if it doesn't exist
        existing = [i.name for i in pc.list_indexes()]
        if INDEX_NAME not in existing:
            logger.info(f"Creating Pinecone index '{INDEX_NAME}'...")
            pc.create_index(
                name=INDEX_NAME,
                dimension=EMBEDDING_DIM,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
            logger.info("Index created.")

        _pinecone_index = pc.Index(INDEX_NAME)
    return _pinecone_index


async def build_index():
    """
    Upsert knowledge base entries into Pinecone on startup.
    Skipped if already indexed (determined by vector count check).
    """
    global _kb_indexed
    if _kb_indexed:
        return

    try:
        index = _get_index()
        stats = index.describe_index_stats()
        if stats.total_vector_count >= len(ALL_ENTRIES):
            logger.info(f"Pinecone index already has {stats.total_vector_count} vectors — skipping upsert.")
            _kb_indexed = True
            return

        logger.info(f"Upserting {len(ALL_ENTRIES)} knowledge base entries into Pinecone...")
        vectors = []
        for entry in ALL_ENTRIES:
            embedding = await get_embedding(entry["text"] + " " + entry.get("explanation", ""))
            vectors.append({
                "id": entry["id"],
                "values": embedding,
                "metadata": {
                    "type": entry["type"],
                    "quality": entry["quality"],
                    "text": entry["text"][:800],      # Pinecone metadata limit
                    "explanation": entry.get("explanation", "")[:500],
                }
            })

        # Upsert in batches of 10
        for i in range(0, len(vectors), 10):
            index.upsert(vectors=vectors[i:i + 10])

        _kb_indexed = True
        logger.info("Knowledge base indexed into Pinecone successfully.")

    except Exception as e:
        logger.error(f"Failed to build Pinecone index: {e}")
        # Non-fatal — app degrades gracefully without RAG
        _kb_indexed = False


async def retrieve(query_text: str, entry_type: str = None, top_k: int = 3) -> list[dict]:
    """
    Retrieve top-K most relevant knowledge base entries for a given query.
    Returns a list of metadata dicts, or an empty list on failure.
    """
    try:
        index = _get_index()
        query_embedding = await get_embedding(query_text)

        filter_dict = {"type": {"$eq": entry_type}} if entry_type else None

        results = await asyncio.to_thread(
            lambda: index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict
            )
        )

        retrieved = []
        for match in results.matches:
            if match.score > 0.3:   # Minimum relevance threshold
                retrieved.append({
                    "id": match.id,
                    "score": round(match.score, 3),
                    "type": match.metadata.get("type"),
                    "quality": match.metadata.get("quality"),
                    "text": match.metadata.get("text"),
                    "explanation": match.metadata.get("explanation"),
                })
        return retrieved

    except Exception as e:
        logger.warning(f"RAG retrieval failed (non-fatal): {e}")
        return []


def format_rag_context(examples: list[dict], entry_type: str) -> str:
    """
    Format retrieved examples into a prompt-injectable context block.
    """
    if not examples:
        return ""

    label = "user stories" if entry_type == "user_story" else "test cases"
    lines = [f"\n--- REFERENCE EXAMPLES (from knowledge base of {label}) ---"]
    for i, ex in enumerate(examples, 1):
        quality_tag = f"[{ex['quality'].upper()} QUALITY]"
        lines.append(f"\nExample {i} {quality_tag}:")
        lines.append(f"  Input: {ex['text']}")
        lines.append(f"  Why: {ex['explanation']}")
    lines.append("\n--- Use these examples as calibration references when scoring. ---\n")
    return "\n".join(lines)
