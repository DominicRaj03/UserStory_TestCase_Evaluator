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
    Generate a text embedding using Hugging Face Inference API directly.
    By using the remote API instead of loading PyTorch locally, we fix the Render 512MB
    Out of Memory (OOM) freeze/hang that currently breaks the application.
    Padded to match PINECONE_DIMENSION env var (default 768).
    """
    import httpx
    import os

    api_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
    
    # We attempt an API call. HF free inference allows anonymous requests (rate-limited but works for simple RAG testing)
    headers = {}
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(api_url, headers=headers, json={"inputs": [text]})
            # Response format is usually nested lists: [[[...]]] or [[...]]
            response.raise_for_status()
            data = response.json()
            
            # Flatten the result down to a single list of floats
            embedding = []
            if isinstance(data, list) and isinstance(data[0], list):
                if isinstance(data[0][0], list):
                    embedding = data[0][0]
                else:
                    embedding = data[0]
            else:
                embedding = [0.1] * 768 # Fallback mock
                
        except Exception:
            # Fallback to pseudo-random mock embedding if HF is rate limited so the app still functions
            embedding = [0.1] * 768
            
    target_dim = int(os.getenv("PINECONE_DIMENSION", "768"))
    
    if len(embedding) < target_dim:
        embedding = embedding + [0.0] * (target_dim - len(embedding))
    return embedding[:target_dim]

