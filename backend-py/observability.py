"""
Groq LLM Judge — wraps Groq via DeepEvalBaseLLM so DeepEval metrics
use Groq (Llama) instead of OpenAI as the judge model.

Also initialises Langfuse for trace logging. Every evaluation is
logged as a Langfuse trace so you can see pretty dashboards at
cloud.langfuse.com without paying for OpenAI.
"""

import os
import asyncio
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Langfuse — direct REST API integration
# ---------------------------------------------------------------------------
import uuid
import time
import httpx
import logging

def log_trace(name: str, input_text: str, output: dict, scores: Optional[dict] = None):
    """
    Send a trace to Langfuse with optional evaluation scores using plain HTTP.
    This safely bypasses Pydantic V1/V2 dependency version conflicts.
    """
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    base_url   = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")

    if not secret_key or not public_key:
        return

    try:
        trace_id = str(uuid.uuid4())
        
        # We manually generate an ISO8601 string safely compatible with python3.x
        from datetime import datetime
        now_ts = datetime.utcnow().isoformat() + "Z"

        # 1. Prepare trace event
        trace_event = {
            "id": str(uuid.uuid4()),
            "type": "trace-create",
            "timestamp": now_ts,
            "body": {
                "id": trace_id,
                "name": name,
                "input": {"text": input_text},
                "output": output
            }
        }

        batch_events = [trace_event]

        # 2. Add score events if any
        if scores:
            for s_name, s_val in scores.items():
                batch_events.append({
                    "id": str(uuid.uuid4()),
                    "type": "score-create",
                    "timestamp": now_ts,
                    "body": {
                        "id": str(uuid.uuid4()),
                        "traceId": trace_id,
                        "name": s_name,
                        "value": s_val
                    }
                })

        # 3. Fire and forget
        payload = {"batch": batch_events}
        # In a generic background thread to not block eval response time
        def do_request():
            try:
                # 5 second timeout to prevent hanging the evaluator threads
                httpx.post(
                    f"{base_url.rstrip('/')}/api/public/ingestion", 
                    json=payload, 
                    auth=(public_key, secret_key), 
                    timeout=5.0
                )
            except Exception as e:
                logging.warning(f"Langfuse background HTTP reporting failed (non-fatal): {e}")

        asyncio.create_task(asyncio.to_thread(do_request))

    except Exception as e:
        logging.warning(f"Langfuse trace creation failed (non-fatal): {e}")


# ---------------------------------------------------------------------------
# Groq custom LLM judge for DeepEval
# ---------------------------------------------------------------------------

from deepeval.models import DeepEvalBaseLLM

class GroqJudge(DeepEvalBaseLLM):
    """
    Custom LLM class that wraps Groq to act as a DeepEval judge.
    Implements the interface expected by DeepEvalBaseLLM.
    """

    def __init__(self):
        import groq as groq_sdk
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        self.client = groq_sdk.Groq(api_key=api_key)
        self.model  = os.getenv("MODEL", "llama-3.1-8b-instant")

    def load_model(self):
        return self.client

    # DeepEval calls this synchronously
    def generate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    # DeepEval calls this asynchronously in some paths
    async def a_generate(self, prompt: str) -> str:
        return await asyncio.to_thread(self.generate, prompt)

    def get_model_name(self) -> str:
        return f"groq/{self.model}"


# Singleton
_groq_judge: Optional[GroqJudge] = None

def get_groq_judge() -> GroqJudge:
    global _groq_judge
    if _groq_judge is None:
        _groq_judge = GroqJudge()
    return _groq_judge
