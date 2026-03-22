import asyncio
import traceback
from deepeval_metrics import run_deepeval_metrics
import logging

logging.basicConfig(level=logging.INFO)

async def test():
    print("Testing DeepEval...")
    try:
        res = await run_deepeval_metrics("Test input", "Test output", [{"text": "Rag ctx"}], "user_story")
        print("RESULT METRICS:", res)
    except Exception as e:
        print("EXCEPTION:", e)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
