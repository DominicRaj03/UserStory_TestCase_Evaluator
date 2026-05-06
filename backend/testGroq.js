const Groq = require('groq-sdk');
require('dotenv').config({ path: 'e:/Domi/GenAi/VS Solution/US Evaluator/backend/.env' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

async function test() {
  const prompt = `You are a professional QA test case generator.
  
  FEATURE/ EPIC DESCRIPTION:
  "As a corporate employee, I want to log in using my Azure AD credentials to access the QA Evaluator Tool."
  
  CRITICAL REQUIREMENT:
  You MUST generate EXACTLY 6 test cases total. No more, no less.
  Distribute these 6 cases exactly as follows:
  - 3 cases for Positive Test Cases
  - 3 cases for Negative Test Cases
  
  Do NOT create categories that are not in this list.
  
  RESPONSE FORMAT (Strict JSON, no markdown):
  {
    "testCases": [
      {"category": "Category Name", "cases": [
        {"id": "TC_001", "name": "string", "description": "string", "precondition": "string", "testData": "string", "steps": ["step 1", "step 2"], "expectedResult": "string", "riskLevel": "Medium"}
      ]}
    ],
    "summary": "Summarize the test coverage strategy"
  }
  
  The "riskLevel" field must be one of: "Low", "Medium", or "High".
  
  IMPORTANT DATA RULES:
  - "testData": This must be the actual input data (e.g., 'username: user1, password: pass'). If no specific data is required, output exactly "N/A".
  - "precondition": The system state required before the test. If none is required, output exactly "N/A".
  - Make sure the JSON is perfectly formatted. Do not include trailing commas.
  
  All 6 test cases must be distinct and high-quality. Return ONLY the raw JSON object.`;

  console.log("Calling Groq...");
  const message = await groq.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  console.log("Response:", message.choices[0].message.content);
  console.log("Finish Reason:", message.choices[0].finish_reason);
}

test().catch(console.error);
