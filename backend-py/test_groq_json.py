import asyncio
import json
from groq_client import chat_completion
from json_repair import repair_json_string

prompt = """
Analyze this User Story: "As a user, I want to be able to reset my password so that I can regain access to my account if I forget it."

Evaluate it using the INVEST criteria. For each criterion, assign a score from 1 (poor) to 5 (excellent) and provide a brief breakdown.
Only assign a score of 5 if ALL aspects of the criterion are fully met with no gaps. If any aspect is missing or unclear, reduce the score accordingly. Be critical and realistic in your assessment.
- Independent: The story should stand alone and not depend on others to avoid scheduling bottlenecks.
- Negotiable: It acts as a reminder for a conversation rather than a rigid contract.
- Valuable: It must deliver clear value to the end user or business.
- Estimable: The team must understand it well enough to estimate the effort.
- Small: It should fit within a single iteration or sprint.
- Testable: It includes clear acceptance criteria to verify completion.
For each criterion, justify the score and explain what is missing if the score is less than 5.
Return ONLY a JSON object in this format:
{
  "totalScore": number,
  "parameters": [
    {"name": "Independent", "score": number, "findings": "string"},
    {"name": "Negotiable", "score": number, "findings": "string"},
    {"name": "Valuable", "score": number, "findings": "string"},
    {"name": "Estimable", "score": number, "findings": "string"},
    {"name": "Small", "score": number, "findings": "string"},
    {"name": "Testable", "score": number, "findings": "string"}
  ],
  "grade": "A" | "B" | "C" | "D",
  "recommendations": ["string", "string", "string"]
}
Grade scale: A: 27-30, B: 22-26, C: 16-21, D: 6-15
"""

async def run_test():
    res = await chat_completion(prompt, max_tokens=2048)
    print("====== RAW ======")
    print(res)
    print("====== REPAIRED ======")
    repaired = repair_json_string(res)
    print(repaired)
    print("====== PARSED ======")
    import json
    try:
        data = json.loads(repaired)
        print("Success:", data.keys())
    except Exception as e:
        print("Error parsing JSON:", e)

if __name__ == "__main__":
    asyncio.run(run_test())
