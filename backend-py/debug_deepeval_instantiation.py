import asyncio
import traceback

async def test():
    try:
        from deepeval.test_case import LLMTestCase
        from deepeval.metrics import FaithfulnessMetric
        from observability import get_groq_judge

        judge = get_groq_judge()
        print("Got judge")
        test_case = LLMTestCase(
            input="hi", actual_output="hi", expected_output="hi"
        )
        print("Got test case")
        metric = FaithfulnessMetric(threshold=0.5, model=judge)
        print("Got metric")
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
