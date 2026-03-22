"""
QA Evaluator — Python/FastAPI Backend
Ports all Node.js Express endpoints + adds RAG (Pinecone) context injection.
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

from json_repair import repair_json_string
from groq_client import chat_completion
from rag_engine import build_index, retrieve, format_rag_context
from deepeval_metrics import run_deepeval_metrics
from observability import log_trace, get_langfuse

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODEL = os.getenv("MODEL", "llama-3.1-8b-instant")

# ---------------------------------------------------------------------------
# Lifespan — build Pinecone index on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 QA Evaluator API starting...")
    logger.info(f"📊 Model: {MODEL}")
    # Init Langfuse connection early
    get_langfuse()
    logger.info("🔍 Building RAG index from knowledge base...")
    await build_index()
    logger.info("✅ Ready.")
    yield
    logger.info("👋 Shutting down.")


app = FastAPI(title="QA Evaluator API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class UserStoryRequest(BaseModel):
    userStory: str
    runDeepEval: Optional[bool] = False

    @field_validator("userStory")
    @classmethod
    def validate_user_story(cls, v):
        v = v.strip()
        if len(v) < 10:
            raise ValueError("userStory must be at least 10 characters long")
        if len(v) > 2000:
            raise ValueError("userStory must not exceed 2000 characters")
        return v


class TestCaseRequest(BaseModel):
    testCase: str
    runDeepEval: Optional[bool] = False

    @field_validator("testCase")
    @classmethod
    def validate_test_case(cls, v):
        v = v.strip()
        if len(v) < 10:
            raise ValueError("testCase must be at least 10 characters long")
        if len(v) > 2000:
            raise ValueError("testCase must not exceed 2000 characters")
        return v


class GenerateRequest(BaseModel):
    feature: str


class ImageDescRequest(BaseModel):
    description: Optional[str] = None
    feature: Optional[str] = None


class JiraRequest(BaseModel):
    domain: str
    email: str
    apiToken: str
    projectKey: str


class AzureRequest(BaseModel):
    organization: str
    project: str
    personalAccessToken: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------



# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "QA Evaluator API is running (Python/FastAPI + RAG)",
        "version": "2.0.0",
        "endpoints": {
            "health": "GET /health",
            "evaluate": "POST /evaluate",
            "evaluateTestCase": "POST /evaluate-test-case",
            "generateTestCases": "POST /generate-test-cases",
            "generateTestCasesFromImage": "POST /generate-test-cases-from-image",
        }
    }


@app.get("/health")
def health():
    return {
        "status": "OK",
        "model": MODEL,
        "apiKeyConfigured": bool(os.getenv("GROQ_API_KEY")),
        "pineconeConfigured": bool(os.getenv("PINECONE_API_KEY")),
        "environment": os.getenv("NODE_ENV", "production"),
    }


# ---------------------------------------------------------------------------
# POST /evaluate  — User Story INVEST evaluation with RAG
# ---------------------------------------------------------------------------

@app.post("/evaluate")
async def evaluate_user_story(req: UserStoryRequest):
    user_story = req.userStory
    logger.info(f"Evaluating user story ({len(user_story)} chars)")

    # RAG: retrieve relevant reference examples
    rag_examples = await retrieve(user_story, entry_type="user_story", top_k=3)
    rag_context = format_rag_context(rag_examples, entry_type="user_story")

    prompt = f"""
Analyze this User Story: "{user_story}"
{rag_context}
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
{{
  "totalScore": number,
  "parameters": [
    {{"name": "Independent", "score": number, "findings": "string"}},
    {{"name": "Negotiable", "score": number, "findings": "string"}},
    {{"name": "Valuable", "score": number, "findings": "string"}},
    {{"name": "Estimable", "score": number, "findings": "string"}},
    {{"name": "Small", "score": number, "findings": "string"}},
    {{"name": "Testable", "score": number, "findings": "string"}}
  ],
  "grade": "A" | "B" | "C" | "D",
  "recommendations": ["string", "string", "string"],
  "riskProfile": "string (A concise 1-sentence assessment of the primary risk if this story is implemented as-is)",
  "testingStrategy": "string (A concise 1-sentence recommendation on how QA should approach testing this story)"
}}
Grade scale: A: 27-30, B: 22-26, C: 16-21, D: 6-15
"""

    try:
        raw = await chat_completion(prompt, max_tokens=2048)
        result = json.loads(repair_json_string(raw))
        logger.info(f"Evaluation complete — Score: {result.get('totalScore')}")

        # Attach RAG context metadata to response
        result["ragContext"] = [
            {"id": ex["id"], "quality": ex["quality"], "text": ex["text"][:200], "relevanceScore": ex["score"]}
            for ex in rag_examples
        ]

        # Run DeepEval quality metrics (Groq judge + Langfuse logging) — optional
        if getattr(req, "runDeepEval", False):
            import json as _json
            quality_metrics = await run_deepeval_metrics(
                input_text=user_story,
                output_text=_json.dumps(result),
                rag_context=result["ragContext"],
                eval_type="user_story",
            )
            if quality_metrics:
                result["qualityMetrics"] = quality_metrics

        # Also log the primary evaluation to Langfuse
        log_trace(
            name="evaluate/user_story",
            input_text=user_story,
            output=result,
            scores={"totalScore": result.get("totalScore", 0) / 30},
        )
        return result
    except Exception as e:
        logger.error(f"Error in /evaluate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to evaluate user story: {str(e)}")


# ---------------------------------------------------------------------------
# POST /evaluate-test-case  — Test Case evaluation with RAG
# ---------------------------------------------------------------------------

@app.post("/evaluate-test-case")
async def evaluate_test_case(req: TestCaseRequest):
    test_case = req.testCase
    logger.info(f"Evaluating test case ({len(test_case)} chars)")

    # RAG: retrieve relevant test case examples
    rag_examples = await retrieve(test_case, entry_type="test_case", top_k=3)
    rag_context = format_rag_context(rag_examples, entry_type="test_case")

    prompt = f"""
Analyze this Test Case: "{test_case}"
{rag_context}
Evaluate it based on the following criteria:
1. Clarity: Are the steps easy to understand and follow?
2. Requirements Traceability: Do test cases cover all requirements?
3. Accuracy: Are the expected results precise and realistic?
4. Completeness: Are preconditions and postconditions defined?
5. Coverage: Are negative, edge, and valid scenarios included?
For each criterion, assign a score from 1 (poor) to 5 (excellent) and provide a brief breakdown. Only assign a score of 5 if ALL aspects are fully met. If any aspect is missing or unclear, reduce the score accordingly. Be critical and realistic in your assessment.
Return ONLY a JSON object EXACTLY in this format (no markdown, no commentary):
{{
  "totalScore": number,
  "parameters": [
    {{"name": "Clarity", "score": number, "findings": "string"}},
    {{"name": "Requirements Traceability", "score": number, "findings": "string"}},
    {{"name": "Accuracy", "score": number, "findings": "string"}},
    {{"name": "Completeness", "score": number, "findings": "string"}},
    {{"name": "Coverage", "score": number, "findings": "string"}}
  ],
  "recommendations": ["string", "string", "string"],
  "riskProfile": "string (A concise 1-sentence assessment of the primary risk if this test case fails)",
  "testingStrategy": "string (A concise 1-sentence recommendation on how to prioritize or execute this test natively)"
}}
"""

    try:
        raw = await chat_completion(prompt, max_tokens=2048)
        result = json.loads(repair_json_string(raw))

        result["ragContext"] = [
            {"id": ex["id"], "quality": ex["quality"], "text": ex["text"][:200], "relevanceScore": ex["score"]}
            for ex in rag_examples
        ]

        # Run DeepEval quality metrics — optional
        if getattr(req, "runDeepEval", False):
            import json as _json
            quality_metrics = await run_deepeval_metrics(
                input_text=test_case,
                output_text=_json.dumps(result),
                rag_context=result["ragContext"],
                eval_type="test_case",
            )
            if quality_metrics:
                result["qualityMetrics"] = quality_metrics

        # Log to Langfuse
        log_trace(
            name="evaluate/test_case",
            input_text=test_case,
            output=result,
            scores={"totalScore": result.get("totalScore", 0) / 25},
        )

        logger.info(f"Test case evaluation complete — Score: {result.get('totalScore')}")
        return result
    except Exception as e:
        logger.error(f"Error in /evaluate-test-case: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to evaluate test case: {str(e)}")


# ---------------------------------------------------------------------------
# POST /generate-user-stories
# ---------------------------------------------------------------------------

@app.post("/generate-user-stories")
async def generate_user_stories(req: GenerateRequest):
    feature = req.feature.strip()
    if len(feature) < 5:
        raise HTTPException(status_code=400, detail="Feature description must be at least 5 characters")

    logger.info(f"Generating user stories for feature ({len(feature)} chars)")

    # RAG: retrieve relevant user story examples to match formatting and style
    rag_examples = await retrieve(feature, entry_type="user_story", top_k=3)
    rag_context = format_rag_context(rag_examples, entry_type="user_story")

    prompt = f"""You are an expert Product Manager. Break down this raw requirement into specific, testable pieces (User Stories).
Requirement: "{feature}"
{rag_context}

CRITICAL: You must respond with ONLY a valid JSON object matching this exact structure:

{{
  "summary": "Brief summary of the epic/feature",
  "userStories": [
    {{
      "name": "Story title",
      "description": "As a [user], I want [action] so that [benefit]",
      "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
      "storyPoints": "1, 2, 3, 5, or 8 (Fibonacci estimation)"
    }}
  ]
}}

Generate at least 3 high-quality User Stories. Return ONLY the JSON, starting with {{ and ending with }}. Do not output markdown code blocks.
"""

    try:
        raw = await chat_completion(prompt, max_tokens=4096)
        result = json.loads(repair_json_string(raw))
        # Attach RAG context metadata to response to show how it was formulated
        result["ragContext"] = [
            {"id": ex["id"], "quality": ex["quality"], "text": ex["text"][:200], "relevanceScore": ex["score"]}
            for ex in rag_examples
        ]
        logger.info(f"User story generation complete: generated {len(result.get('userStories', []))} stories")
        return result
    except Exception as e:
        logger.error(f"Error in /generate-user-stories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate user stories: {str(e)}")

# ---------------------------------------------------------------------------
# POST /generate-test-cases
# ---------------------------------------------------------------------------

@app.post("/generate-test-cases")
async def generate_test_cases(req: GenerateRequest):
    feature = req.feature.strip()
    if len(feature) < 5:
        raise HTTPException(status_code=400, detail="Feature description must be at least 5 characters")

    logger.info(f"Generating test cases for feature ({len(feature)} chars)")

    prompt = f"""You are a professional QA test case generator. Generate comprehensive test cases for this feature:

"{feature}"

CRITICAL: You must respond with ONLY a valid JSON object (no markdown, no explanations, no preamble). The JSON structure must be exactly:

{{
  "testCases": [
    {{"category": "Positive Test Cases", "cases": [{{"name": "", "description": "", "precondition": "", "testData": "", "steps": [], "expectedResult": "", "riskLevel": "Low"}}]}},
    {{"category": "Negative Test Cases", "cases": []}},
    {{"category": "Boundary Value Analysis", "cases": []}},
    {{"category": "Coverage Analysis", "cases": []}}
  ],
  "testData": [{{"field": "", "validData": "", "invalidData": "", "expectedBehavior": "", "errorMessage": ""}}],
  "errorHandling": [],
  "summary": ""
}}

Generate at least 3 positive test cases and populate ALL categories. Return ONLY the JSON, starting with {{ and ending with }}"""

    try:
        raw = await chat_completion(prompt, max_tokens=4096)
        result = json.loads(repair_json_string(raw))
        logger.info("Test case generation complete")
        return result
    except Exception as e:
        logger.error(f"Error in /generate-test-cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate test cases: {str(e)}")


# ---------------------------------------------------------------------------
# POST /generate-test-cases-from-image
# ---------------------------------------------------------------------------

@app.post("/generate-test-cases-from-image")
async def generate_from_image(req: ImageDescRequest):
    description = (req.description or req.feature or "").strip()
    if len(description) < 3:
        raise HTTPException(status_code=400, detail="Please provide a description of what you see in the mockup/screenshot.")

    logger.info("Generating test cases from image description")

    prompt = f"""You are an expert QA test case generator. Based on the following description of a UI mockup/screenshot, generate comprehensive test cases.

MOCKUP DESCRIPTION:
"{description}"

IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations.

Return the response in this exact JSON format:
{{
  "summary": "Brief summary of test cases generated",
  "testCases": [
    {{
      "name": "Descriptive test case name",
      "precondition": "What needs to be set up before the test",
      "steps": "1) First step\\n2) Second step\\n3) Third step",
      "expectedResult": "What should happen after the steps",
      "postcondition": "State after the test completes"
    }}
  ]
}}

Generate 5-8 test cases covering various scenarios based on the mockup description."""

    try:
        raw = await chat_completion(prompt, max_tokens=4096)
        result = json.loads(repair_json_string(raw))
        if not isinstance(result.get("testCases"), list):
            raise ValueError("Response missing testCases array")
        logger.info(f"Generated {len(result['testCases'])} test cases from image description")
        return result
    except Exception as e:
        logger.error(f"Error in /generate-test-cases-from-image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate test cases from mockup: {str(e)}")


# ---------------------------------------------------------------------------
# POST /integration/jira/stories
# ---------------------------------------------------------------------------

@app.post("/integration/jira/stories")
async def jira_stories(req: JiraRequest):
    import httpx, base64
    logger.info(f"Jira integration request for project: {req.projectKey}")

    auth = base64.b64encode(f"{req.email}:{req.apiToken}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    jql = f'project = "{req.projectKey}" AND type in (Story, Task) ORDER BY created DESC'
    payload = {"jql": jql, "maxResults": 50, "fields": ["key", "summary", "description", "status"]}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://{req.domain}/rest/api/3/search/jql",
                headers=headers,
                json=payload
            )

        if resp.status_code in (401, 403):
            raise HTTPException(status_code=401, detail="Failed to authenticate with Jira. Please verify your credentials.")
        if resp.status_code != 200:
            data = resp.json()
            raise HTTPException(status_code=resp.status_code, detail=data.get("errorMessages", [f"Jira API error {resp.status_code}"])[0])

        issues = resp.json().get("issues", [])
        stories = []
        for issue in issues:
            desc = issue["fields"].get("description")
            desc_text = "No description"
            if desc and isinstance(desc, dict) and "content" in desc:
                desc_text = " ".join(
                    item.get("text", "")
                    for block in desc["content"]
                    for item in (block.get("content") or [])
                ).strip() or "No description"
            elif isinstance(desc, str):
                desc_text = desc
            stories.append({
                "key": issue["key"],
                "summary": issue["fields"].get("summary", "Untitled"),
                "description": desc_text,
                "status": issue["fields"].get("status", {}).get("name", "Unknown"),
            })

        logger.info(f"Fetched {len(stories)} stories from Jira")
        return {"stories": stories}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Jira error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Jira: {str(e)}")


# ---------------------------------------------------------------------------
# POST /integration/azure/work-items
# ---------------------------------------------------------------------------

@app.post("/integration/azure/work-items")
async def azure_work_items(req: AzureRequest):
    import httpx, base64
    logger.info(f"Azure DevOps integration for project: {req.project}")

    auth = base64.b64encode(f":{req.personalAccessToken}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    wiql = (
        "Select [System.Id], [System.Title], [System.Description], [System.State] "
        "From WorkItems Where [System.TeamProject] = @project "
        "AND [System.WorkItemType] in ('User Story', 'Task') "
        "ORDER BY [System.CreatedDate] desc"
    )

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://dev.azure.com/{req.organization}/{req.project}/_apis/wit/wiql?api-version=7.0",
                headers=headers,
                json={"query": wiql}
            )

        if resp.status_code in (401, 403):
            raise HTTPException(status_code=401, detail="Failed to authenticate with Azure DevOps. Please verify your credentials.")
        if resp.status_code != 200:
            data = resp.json()
            raise HTTPException(status_code=resp.status_code, detail=data.get("message", f"Azure API error {resp.status_code}"))

        items = resp.json().get("workItems", [])[:50]
        work_items = [
            {
                "id": item["id"],
                "title": item.get("fields", {}).get("System.Title", "Untitled"),
                "description": item.get("fields", {}).get("System.Description", "No description"),
                "status": item.get("fields", {}).get("System.State", "Unknown"),
            }
            for item in items
        ]

        logger.info(f"Fetched {len(work_items)} work items from Azure DevOps")
        return {"workItems": work_items}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Azure error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Azure DevOps: {str(e)}")


# ---------------------------------------------------------------------------
# Run (for local development)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
