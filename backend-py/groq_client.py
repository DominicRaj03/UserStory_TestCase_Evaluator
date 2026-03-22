import os
import asyncio
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

_client = None
_embed_model = None

def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is not set")
        _client = AsyncGroq(api_key=api_key)
    return _client


def get_model() -> str:
    return os.getenv("MODEL", "llama-3.1-8b-instant")


async def chat_completion(prompt: str, max_tokens: int = 2048) -> str:
    """Send a prompt to Groq and return the text response asynchronously."""
    client = get_groq_client()
    model = get_model()
    response = await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


async def get_embedding(text: str) -> list:
    """
    Generate a text embedding using sentence-transformers (local, free, no API needed).
    Uses all-MiniLM-L6-v2 — 384-dim, fast, high quality for semantic similarity.
    Padded to match PINECONE_DIMENSION env var (default 768).

    NOTE: Groq removed their /embeddings API endpoint (returns model_not_found).
    sentence-transformers is the drop-in replacement — works offline, no quota.
    """
    from sentence_transformers import SentenceTransformer

    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")

    # Run in thread pool so we don't block the async event loop
    embedding = await asyncio.to_thread(
        lambda: _embed_model.encode(text, normalize_embeddings=True).tolist()
    )

    # Pad or truncate to match the configured Pinecone index dimension
    target_dim = int(os.getenv("PINECONE_DIMENSION", "768"))
    if len(embedding) < target_dim:
        embedding = embedding + [0.0] * (target_dim - len(embedding))
    return embedding[:target_dim]
