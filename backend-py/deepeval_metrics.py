"""
DeepEval metrics module — runs 5 evaluation quality checks using Groq as the
judge LLM (via GroqJudge wrapper) and logs results to Langfuse Cloud.

Metrics:
  - Faithfulness         : output is grounded in the input
  - Contextual Relevancy : retrieved RAG examples are relevant
  - Contextual Recall    : all retrieved context was utilised
  - Answer Relevancy     : response addresses the question asked
  - Hallucination        : no fabricated facts

All metrics are non-fatal — if DeepEval or Langfuse fail, evaluation still
returns normally (metrics just won't be included in the response).
"""

import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

# Hard limits — each metric gets at most 20 s; entire block at most 60 s
PER_METRIC_TIMEOUT = 20   # seconds
TOTAL_TIMEOUT      = 60   # seconds


async def _run_single_metric(metric, test_case) -> dict:
    """Run one metric with a per-metric timeout."""
    await asyncio.wait_for(
        asyncio.to_thread(metric.measure, test_case),
        timeout=PER_METRIC_TIMEOUT,
    )
    return {
        "score":  round(metric.score, 3),
        "passed": metric.is_successful(),
        "reason": getattr(metric, "reason", ""),
    }


async def _run_all_metrics(metrics, test_case) -> dict:
    """Run all metrics in parallel within TOTAL_TIMEOUT."""
    results = {}
    
    async def worker(metric):
        name = type(metric).__name__.replace("Metric", "")
        try:
            res = await _run_single_metric(metric, test_case)
            return name, res
        except asyncio.TimeoutError:
            logger.warning(f"DeepEval metric {name} timed out (>{PER_METRIC_TIMEOUT}s)")
            return name, {"score": None, "passed": None, "reason": "Timed out"}
        except Exception as e:
            logger.warning(f"DeepEval metric {name} failed: {e}")
            return name, {"score": None, "passed": None, "reason": str(e)}

    # Run all metrics concurrently
    outputs = await asyncio.gather(*(worker(m) for m in metrics), return_exceptions=True)
    
    for item in outputs:
        if isinstance(item, tuple):
            name, res = item
            results[name] = res
            
    return results


async def run_deepeval_metrics(
    input_text: str,
    output_text: str,
    rag_context: list[dict],
    eval_type: str = "user_story",
) -> Optional[dict]:
    """
    Run all 5 DeepEval metrics using Groq as the judge.
    Returns a dict of metric scores (0.0–1.0) or None on failure.
    Times out after TOTAL_TIMEOUT seconds to avoid hanging the response.
    """
    try:
        from deepeval.test_case import LLMTestCase  # type: ignore[import]
        from deepeval.metrics import (  # type: ignore[import]
            FaithfulnessMetric,
            ContextualRelevancyMetric,
            ContextualRecallMetric,
            AnswerRelevancyMetric,
            HallucinationMetric,
        )
        from observability import get_groq_judge, log_trace

        judge = get_groq_judge()

        retrieval_context = [ex.get("text", "") for ex in rag_context if ex.get("text")]

        test_case = LLMTestCase(
            input=input_text,
            actual_output=output_text,
            retrieval_context=retrieval_context if retrieval_context else [input_text],
            context=retrieval_context if retrieval_context else [input_text],
            expected_output=input_text,
        )

        metrics = [
            FaithfulnessMetric(threshold=0.5, model=judge, include_reason=True),
            ContextualRelevancyMetric(threshold=0.5, model=judge, include_reason=True),
            ContextualRecallMetric(threshold=0.5, model=judge, include_reason=True),
            AnswerRelevancyMetric(threshold=0.5, model=judge, include_reason=True),
            HallucinationMetric(threshold=0.5, model=judge, include_reason=True),
        ]

        # Enforce TOTAL_TIMEOUT across all metrics combined
        results = await asyncio.wait_for(
            _run_all_metrics(metrics, test_case),
            timeout=TOTAL_TIMEOUT,
        )

        # Log to Langfuse
        score_map = {k: v["score"] for k, v in results.items() if v["score"] is not None}
        log_trace(
            name=f"deepeval/{eval_type}",
            input_text=input_text,
            output={"metrics": results},
            scores=score_map,
        )

        logger.info(f"DeepEval metrics complete: {list(score_map.keys())}")
        return results

    except asyncio.TimeoutError:
        logger.warning(f"DeepEval timed out entirely (>{TOTAL_TIMEOUT}s) — skipping quality metrics")
        return None
    except ImportError as e:
        logger.warning(f"DeepEval not available: {e}")
        return None
    except Exception as e:
        logger.warning(f"DeepEval run failed (non-fatal): {e}")
        return None
