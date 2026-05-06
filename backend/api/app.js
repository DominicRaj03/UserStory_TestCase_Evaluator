const express = require('express');
const cors = require('cors');
const path = require('path');
const { repairJsonString } = require('../jsonRepair');
const { retrieve, formatRagContext } = require('../utils/ragEngine');
const { runDeepEvalMetricsMock } = require('../utils/evalMetrics');
const { logTrace, testLangfuseConnection } = require('../utils/observability');
const AgenticEngine = require('../utils/agenticEngine');


// Import Groq SDK - handle both CommonJS and ESM exports
let Groq;
try {
  const groqModule = require('groq-sdk');
  console.log(`[${new Date().toISOString()}] Groq module loaded:`, Object.keys(groqModule).slice(0, 5));
  Groq = groqModule.default || groqModule;
  console.log(`[${new Date().toISOString()}] Groq constructor type:`, typeof Groq);
} catch (err) {
  console.error('Failed to import Groq SDK:', err.message);
  console.error('Stack:', err.stack);
}

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from frontend build
// app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'US Evaluator API is running',
    endpoints: {
      health: '/health',
      evaluate: 'POST /evaluate',
      evaluateTestCase: 'POST /evaluate-test-case',
      generateTestCases: 'POST /generate-test-cases',
      generateTestCasesFromImage: 'POST /generate-test-cases-from-image',
      testGroq: 'GET /test-groq'
    }
  });
});

const PORT = process.env.PORT || 5000;
const MODEL = process.env.MODEL || 'llama-3.1-8b-instant';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Check if API key is configured
if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
  console.error('ERROR: GROQ_API_KEY environment variable is not set!');
  console.error('Please set GROQ_API_KEY in your environment or .env file');
}

let groq = null;
try {
  if (!Groq) {
    throw new Error('Groq SDK not loaded - check import above');
  }
  
  const cleanKey = (GROQ_API_KEY || '').trim();
  console.log(`[${new Date().toISOString()}] Initializing Groq with API key length: ${cleanKey.length}`);
  
  groq = new Groq({
    apiKey: cleanKey
  });
  
  console.log(`[${new Date().toISOString()}] Groq SDK initialized successfully`);
} catch (err) {
  console.error(`[${new Date().toISOString()}] Failed to initialize Groq SDK:`, err.message);
}

console.log(`[${new Date().toISOString()}] Server starting...`);
console.log(`[${new Date().toISOString()}] Model: ${MODEL}`);
console.log(`[${new Date().toISOString()}] API Key configured: ${!!GROQ_API_KEY}`);
console.log(`[${new Date().toISOString()}] Groq client ready: ${!!groq}`);

const agenticEngine = groq ? new AgenticEngine(groq, MODEL) : null;


// Repair common JSON issues returned by LLM (quotes, trailing commas, unquoted keys, comments, unbalanced braces)
const validateUserStory = (req, res, next) => {
  const { userStory } = req.body;
  
  if (!userStory) {
    return res.status(400).json({ error: 'userStory field is required' });
  }
  
  if (typeof userStory !== 'string') {
    return res.status(400).json({ error: 'userStory must be a string' });
  }
  
  if (userStory.trim().length < 10) {
    return res.status(400).json({ error: 'userStory must be at least 10 characters long' });
  }
  
  if (userStory.length > 2000) {
    return res.status(400).json({ error: 'userStory must not exceed 2000 characters' });
  }
  
  next();
};

// Test case validation middleware
const validateTestCase = (req, res, next) => {
  const { testCase } = req.body;
  
  if (!testCase) {
    return res.status(400).json({ error: 'testCase field is required' });
  }
  
  if (typeof testCase !== 'string') {
    return res.status(400).json({ error: 'testCase must be a string' });
  }
  
  if (testCase.trim().length < 10) {
    return res.status(400).json({ error: 'testCase must be at least 10 characters long' });
  }
  
  if (testCase.length > 2000) {
    return res.status(400).json({ error: 'testCase must not exceed 2000 characters' });
  }
  
  next();
};

// Calculate health metrics based on evaluation parameters and optional DeepEval metrics
function calculateHealthMetrics(parameters, deepEval = null) {
  const scoreMap = {};
  if (Array.isArray(parameters)) {
    parameters.forEach(param => {
      scoreMap[param.name] = param.score;
    });
  }

  // Convert 1-5 scale to 0-100% scale
  const convertScore = (score) => (score / 5) * 100;

  // Base metrics from LLM analysis
  // For User Stories (INVEST): Valuable -> Faithfulness, Small -> Coverage, Independent -> Compliance, Testable -> Execution Rate
  // For Test Cases: Requirements Traceability -> Faithfulness, Coverage -> Coverage, Accuracy -> Compliance, Completeness -> Execution Rate
  let faithfulness = convertScore(scoreMap['Requirements Traceability'] || scoreMap['Valuable'] || 3);
  let coverage = convertScore(scoreMap['Coverage'] || scoreMap['Small'] || 3);
  let compliance = convertScore(scoreMap['Accuracy'] || scoreMap['Independent'] || 3);
  let executionRate = convertScore(scoreMap['Completeness'] || scoreMap['Testable'] || 3);

  // If DeepEval is enabled, use its higher-precision metrics to refine the health scores
  if (deepEval && typeof deepEval === 'object') {
    // Helper to get case-insensitive key
    const getVal = (targetKey) => {
      const key = Object.keys(deepEval).find(k => k.toLowerCase() === targetKey.toLowerCase());
      return key ? deepEval[key] : null;
    };

    const dFaithfulness = getVal('Faithfulness');
    const dRecall = getVal('Contextual Recall');
    const dCorrectness = getVal('Answer Correctness');
    const dPrecision = getVal('Contextual Precision');

    if (dFaithfulness) faithfulness = dFaithfulness.score * 100;
    if (dRecall) coverage = (coverage + (dRecall.score * 100)) / 2;
    if (dCorrectness) compliance = dCorrectness.score * 100;
    if (dPrecision) executionRate = (executionRate + (dPrecision.score * 100)) / 2;
  }

  return {
    'Faithfulness': Math.round(faithfulness),
    'Coverage': Math.round(coverage),
    'Compliance': Math.round(compliance),
    'Execution Rate': Math.round(executionRate)
  };
}

app.post('/evaluate', validateUserStory, async (req, res) => {
  const { userStory, runDeepEval } = req.body;
  console.log(`[${new Date().toISOString()}] Evaluating user story of ${userStory.length} characters`);

  // Guard: Check if Groq is initialized
  if (!groq) {
    return res.status(500).json({
      error: 'Groq API is not properly initialized',
      message: 'The server needs to be restarted. Contact administrator.'
    });
  }

  const ragExamples = await retrieve(userStory, "user_story", 3);
  const ragContext = formatRagContext(ragExamples, "user_story");

  const prompt = `
    Analyze this User Story: "${userStory}"
    ${ragContext}
    Evaluate it using the INVEST criteria. For each criterion, assign a score from 1 (poor) to 5 (excellent) and provide a brief breakdown.
    Only assign a score of 5 if ALL aspects of the criterion are fully met with no gaps. If any aspect is missing or unclear, reduce the score accordingly. Be critical and realistic in your assessment.
    - Independent: The story should stand alone and not depend on others to avoid scheduling bottlenecks.
    - Negotiable: It acts as a reminder for a conversation rather than a rigid contract.
    - Valuable: It must deliver clear value to the end user or business.
    - Estimable: The team must understand it well enough to estimate the effort.
    - Small: It should fit within a single iteration or sprint.
    - Testable: It includes clear acceptance criteria to verify completion.
    For each criterion, justify the score and explain what is missing if the score is less than 5.
    IMPORTANT: Do NOT include any emojis, icons, or special non-ASCII characters in your findings or recommendations. Use only standard text.
    Return ONLY a JSON object in this format:
    {
      "totalScore": number, // sum of all 6 criteria (max 30)
      "parameters": [
        { "name": "Independent", "score": number, "findings": "string" },
        { "name": "Negotiable", "score": number, "findings": "string" },
        { "name": "Valuable", "score": number, "findings": "string" },
        { "name": "Estimable", "score": number, "findings": "string" },
        { "name": "Small", "score": number, "findings": "string" },
        { "name": "Testable", "score": number, "findings": "string" }
      ],
      "investOverview": "• Independent: [Detailed reason]\n• Negotiable: [Detailed reason]\n• Valuable: [Detailed reason]\n• Estimable: [Detailed reason]\n• Small: [Detailed reason]\n• Testable: [Detailed reason]",
      "grade": "A" | "B" | "C" | "D", // A: 27-30, B: 22-26, C: 16-21, D: 6-15
      "recommendations": ["string", "string", "string"]
    }
  `;

  try {
    const message = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.0,
      response_format: { type: "json_object" },
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    console.log(`[${new Date().toISOString()}] Groq API response received`);
    
    if (!message.choices || !message.choices[0]) {
      throw new Error('Invalid response structure from Groq API');
    }
    
    const content = message.choices[0].message.content;
    console.log(`[${new Date().toISOString()}] Response content (first 500 chars):`, content.substring(0, 500));
    
    const repaired = repairJsonString(content);
    console.log(`[${new Date().toISOString()}] Repaired JSON (first 500 chars):`, repaired.substring(0, 500));
    
    const result = JSON.parse(repaired);

    result.ragContext = ragExamples.map(ex => ({
      id: ex.id, quality: ex.quality, text: ex.text ? ex.text.substring(0, 200) : "", relevanceScore: ex.score
    }));

    if (runDeepEval) {
      result.deepEvalMetric = await runDeepEvalMetricsMock(groq, MODEL, userStory);
    }
    
    // Calculate health metrics
    const healthMetrics = calculateHealthMetrics(result.parameters, result.deepEvalMetric);
    
    // Telemetry: Fire off to Langfuse
    const mappedScores = {};
    if (result.parameters && Array.isArray(result.parameters)) {
      result.parameters.forEach(p => mappedScores[p.name] = parseFloat((Number(p.score) / 5.0).toFixed(4)));
    }
    if (result.deepEvalMetric && typeof result.deepEvalMetric === 'object') {
      Object.entries(result.deepEvalMetric).forEach(([k, v]) => {
        if (v && typeof v === 'object' && v.score !== undefined) {
          mappedScores[k] = parseFloat(Number(v.score).toFixed(4));
        }
      });
    }
    await logTrace("UserStory Evaluation", userStory, result, mappedScores);

    console.log(`[${new Date().toISOString()}] Evaluation complete - Score: ${result.totalScore}`);
    res.json({
      ...result,
      metrics: healthMetrics
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}]  Error in /evaluate:`, error.message);
    console.error(`[${new Date().toISOString()}] Error stack:`, error.stack);
    
    let errorMessage = 'Failed to evaluate user story. Please try again later.';
    
    if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
      errorMessage = 'GROQ_API_KEY is not configured on the server.';
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'Groq API key is invalid or expired.';
    } else if (error.message.includes('API key')) {
      errorMessage = 'Groq API key error. Verify GROQ_API_KEY is set correctly.';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.message.includes('JSON')) {
      errorMessage = 'Failed to parse API response. Model may not have returned valid JSON.';
    } else if (error.message.includes('model') || error.message.includes('Model')) {
      errorMessage = `Model error: ${error.message}. Check if model '${MODEL}' is available.`;
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Groq API quota may be full.';
    } else if (error.status === 401 || error.status === 403) {
      errorMessage = 'API authentication failed. Groq API key may be invalid.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      errorType: error.type || error.constructor.name,
      model: MODEL,
      response_format: { type: "json_object" },
      timestamp: new Date().toISOString()
    });
  }
});

// Test case evaluation endpoint
app.post('/evaluate-test-case', validateTestCase, async (req, res) => {
  const { testCase, runDeepEval } = req.body;
  console.log(`[${new Date().toISOString()}] Evaluating test case of ${testCase.length} characters`);

  const ragExamples = await retrieve(testCase, "test_case", 3);
  const ragContext = formatRagContext(ragExamples, "test_case");

  const prompt = `
    Analyze this Test Case: "${testCase}"
    ${ragContext}
      Evaluate it based on the following criteria:
      1. Clarity: Are the steps easy to understand and follow?
      2. Requirements Traceability: Do test cases cover all requirements?
      3. Accuracy: Are the expected results precise and realistic?
      4. Completeness: Are preconditions and postconditions defined?
      5. Coverage: Are negative, edge, and valid scenarios included?
      For each criterion, assign a score from 1 (poor) to 5 (excellent) and provide a brief breakdown. Only assign a score of 5 if ALL aspects are fully met. If any aspect is missing or unclear, reduce the score accordingly. Be critical and realistic in your assessment.
      IMPORTANT: Do NOT include any emojis, icons, or special non-ASCII characters in your findings or recommendations. Use only standard text.
    Return ONLY a JSON object EXACTLY in this format (no markdown, no commentary):
    {
      "totalScore": number, // sum of the 5 criteria (max 25)
      "parameters": [
        { "name": "Clarity", "score": number, "findings": "string" },
        { "name": "Requirements Traceability", "score": number, "findings": "string" },
        { "name": "Accuracy", "score": number, "findings": "string" },
        { "name": "Completeness", "score": number, "findings": "string" },
        { "name": "Coverage", "score": number, "findings": "string" }
      ],
      "recommendations": ["string", "string", "string"]
    }
  `;

  try {
    const message = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.0,
      response_format: { type: "json_object" },
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = message.choices[0].message.content;
    const result = JSON.parse(repairJsonString(content));

    result.ragContext = ragExamples.map(ex => ({
      id: ex.id, quality: ex.quality, text: ex.text ? ex.text.substring(0, 200) : "", relevanceScore: ex.score
    }));

    console.log(`[${new Date().toISOString()}] Test case evaluation complete - Score: ${result.totalScore}`);
    
    if (runDeepEval) {
      result.deepEvalMetric = await runDeepEvalMetricsMock(groq, MODEL, testCase);
    }

    // Calculate health metrics based on the evaluation parameters AND DeepEval
    const healthMetrics = calculateHealthMetrics(result.parameters, result.deepEvalMetric);

    // Telemetry: Fire off to Langfuse
    const mappedScores = {};
    if (result.parameters && Array.isArray(result.parameters)) {
      result.parameters.forEach(p => mappedScores[p.name] = parseFloat((Number(p.score) / 5.0).toFixed(4)));
    }
    if (result.deepEvalMetric && typeof result.deepEvalMetric === 'object') {
      Object.entries(result.deepEvalMetric).forEach(([k, v]) => {
        if (v && typeof v === 'object' && v.score !== undefined) {
          mappedScores[k] = parseFloat(Number(v.score).toFixed(4));
        }
      });
    }
    await logTrace("TestCase Evaluation", testCase, result, mappedScores);

    // Add health metrics to the response
    const responseData = {
      ...result,
      metrics: healthMetrics
    };
    
    res.json(responseData);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    const errorMessage = error.message.includes('API key')
      ? 'Groq API key is not configured. Please set GROQ_API_KEY environment variable.'
      : 'Failed to evaluate test case. Please try again later.';
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Langfuse connectivity diagnostic endpoint
app.get('/test-langfuse', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Testing Langfuse connection...`);
  const result = await testLangfuseConnection();
  const statusCode = result.status === 'OK' ? 200 : 500;
  res.status(statusCode).json(result);
});

// Test Groq connection endpoint (for debugging)
app.get('/test-groq', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Testing Groq connection...`);
  
  if (!groq) {
    return res.status(500).json({
      success: false,
      error: 'Groq SDK is not initialized',
      apiKeyConfigured: !!GROQ_API_KEY,
      apiKeyLength: GROQ_API_KEY?.length || 0,
      reason: 'Failed to initialize Groq client on server startup',
      groqType: typeof Groq,
      groqExists: !!Groq
    });
  }
  
  if (!groq || typeof groq.chat?.completions?.create !== 'function') {
    return res.status(500).json({
      success: false,
      error: 'Groq.chat.completions.create is not available',
      groqType: groq.constructor.name,
      hasChat: !!groq.chat,
      hasCompletions: !!groq.chat?.completions,
      hasCreate: groq.chat?.completions ? typeof groq.chat.completions.create : 'chat.completions is undefined'
    });
  }
  
  try {
    const message = await groq.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Say 'Groq API is working' and nothing else."
        }
      ]
    });

    const response = {
      success: true,
      model: MODEL,
      response_format: { type: "json_object" },
      message: message.choices[0].message.content,
      timestamp: new Date().toISOString()
    };

    console.log(`[${new Date().toISOString()}]  Groq test successful:`, response.message);
    res.json(response);
  } catch (error) {
    console.error(`[${new Date().toISOString()}]  Groq test failed:`, error.message);
    console.error(`Error details:`, {
      type: error.type,
      status: error.status,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.type || error.name,
      status: error.status || 500,
      code: error.code,
      hasApiKey: !!GROQ_API_KEY,
      apiKeyLength: GROQ_API_KEY ? GROQ_API_KEY.length : 0,
      model: MODEL,
      response_format: { type: "json_object" },
      failedAt: 'groq.chat.completions.create'
    });
  }
});

// User story generation endpoint
app.post('/generate-user-stories', async (req, res) => {
  const { feature } = req.body;
  console.log(`[${new Date().toISOString()}] Generating user stories for epic/feature of ${feature?.length || 0} characters`);

  if (!feature || feature.trim().length < 5) {
    return res.status(400).json({ error: 'Feature description must be at least 5 characters' });
  }

  const ragExamples = await retrieve(feature, "user_story", 3);
  const ragContext = formatRagContext(ragExamples, "user_story");

  const prompt = `You are an expert Agile Product Owner. Break down this feature/epic into smaller, highly actionable User Stories:

FEATURE DESCRIPTION:
"${feature}"
${ragContext}

Ensure you generate at least 3 distinct user stories.
IMPORTANT: Do NOT include any emojis, icons, or special non-ASCII characters in your descriptions or criteria. Use only standard text.
CRITICAL: You must respond with ONLY a valid JSON object in the exact structure below. Do not use markdown blocks:
{
  "summary": "Brief summary of the feature breakdown strategy",
  "userStories": [
    {
      "name": "Short descriptive title",
      "description": "As a [type of user], I want [some goal] so that [some reason]",
      "acceptanceCriteria": ["AC 1", "AC 2"],
      "storyPoints": 3,
      "analysis": {
        "independent": 5,
        "negotiable": 5,
        "valuable": 5,
        "estimable": 5,
        "small": 5,
        "testable": 5,
        "investDetailedBreakdown": "• Independent: [Reason]\n• Negotiable: [Reason]\n• Valuable: [Reason]\n• Estimable: [Reason]\n• Small: [Reason]\n• Testable: [Reason]"
      }
    }
  ]
}

Ensure you generate at least 3 distinct user stories. Return ONLY the raw JSON object.`;

  try {
    const message = await groq.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = message.choices[0].message.content;
    const result = JSON.parse(repairJsonString(content));

    result.ragContext = ragExamples.map(ex => ({
      id: ex.id, quality: ex.quality, text: ex.text ? ex.text.substring(0, 200) : "", relevanceScore: ex.score
    }));

    // Telemetry: Fire off to Langfuse
    await logTrace("UserStory Generation", feature, result);

    console.log(`[${new Date().toISOString()}] User story generation complete`);
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /generate-user-stories:`, error.message);
    
    let errorMessage = 'Failed to generate user stories. Please try again later.';
    if (error.message.includes('API key')) {
      errorMessage = 'Groq API key is not configured.';
    } else if (error.message.includes('JSON')) {
      errorMessage = 'Model did not return valid JSON. Try again.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test case generation endpoint
app.post('/generate-test-cases', async (req, res) => {
  const { feature, categories, totalCount } = req.body;
  console.log(`[${new Date().toISOString()}] Generating test cases for feature of ${feature?.length || 0} characters`);

  if (!feature || feature.trim().length < 5) {
    return res.status(400).json({ error: 'Feature description must be at least 5 characters' });
  }

  const ragExamples = await retrieve(feature, "test_case", 3);
  const ragContext = formatRagContext(ragExamples, "test_case");

  // Category mapping for prompt construction
  const CATEGORY_MAP = {
    'Positive':    'Positive Test Cases',
    'Negative':    'Negative Test Cases',
    'Edge Case':   'Boundary Value Analysis',
    'Validation':  'Validation Test Cases',
    'Security':    'Security Test Cases',
    'Performance': 'Performance Test Cases',
    'Boundary':    'Boundary Value Test Cases',
  };

  // Use explicit categories/count if provided, else fallback to defaults
  const selectedCategories = (categories && categories.length > 0)
    ? categories.map(c => CATEGORY_MAP[c] || c)
    : ['Positive Test Cases', 'Negative Test Cases', 'Boundary Value Analysis', 'Coverage Analysis'];

  // Cap count at 10 as per requirements for Agentic AI precision
  const requestedCount = (totalCount && Number(totalCount) > 0) ? Math.min(Number(totalCount), 10) : 10;

  // Calculate exact distribution
  const perType = Math.floor(requestedCount / selectedCategories.length);
  const remainder = requestedCount % selectedCategories.length;

  const validCategories = [];
  selectedCategories.forEach((c, index) => {
    const cnt = perType + (index < remainder ? 1 : 0);
    if (cnt > 0) validCategories.push({ category: c, count: cnt });
  });

  // Build the category slots for the prompt without comments inside the JSON
  const categorySlots = validCategories.map(vc => {
    return `{"category": "${vc.category}", "cases": []}`;
  }).join(',\n      ');
  
  const distributionText = validCategories.map(vc => {
    return `- ${vc.count} cases for ${vc.category}`;
  }).join('\n  ');

  const categoryList = validCategories.map(vc => vc.category).join(', ');

  const prompt = `You are a professional QA test case generator.
  
  FEATURE/ EPIC DESCRIPTION:
  "${feature}"
  
  CONTEXTUAL REFERENCE:
  ${ragContext}
  
  IMPORTANT RULES:
  - "steps": MUST be a SINGLE STRING where each step starts on a NEW LINE with a number (e.g., "1. Action A\n2. Action B").
  - NEVER combine multiple steps into a single line.
  - DO NOT return "steps" as an array; it MUST be a string with explicit \n characters.
  - Do NOT include any emojis, icons, or special non-ASCII characters in your steps or results. Use only standard text.
  
  CRITICAL REQUIREMENT:
  You MUST generate EXACTLY ${requestedCount} test cases total. No more, no less.
  You MUST distribute these ${requestedCount} cases exactly into these categories using these EXACT strings for the "category" field:
  ${distributionText}
  
  Do NOT change these strings (e.g., do not change "Positive Test Cases" to "Positive Test Case"). Use them EXACTLY as written.
  Do NOT create categories that are not in this list.
  
  RESPONSE FORMAT (Strict JSON, no markdown):
  {
    "testCases": [
      {"category": "Category Name", "cases": [
        {
          "name": "Concise and descriptive name", 
          "steps": "1. Step one\n2. Step two\n3. Step three", 
          "expectedResult": "Clear and measurable outcome", 
          "analysis": {
             "clarity": 5,
             "traceability": 5,
             "coverage": 5,
             "justification": "Why this score"
          }
        }
      ]}
    ],
    "summary": "Summarize the test coverage strategy"
  }
  
  The "riskLevel" field must be one of: "Low", "Medium", or "High".
  
  IMPORTANT DATA RULES:
  - "testData": This must be the actual input data (e.g., 'username: user1, password: pass'). If no specific data is required, output exactly "N/A".
  - "precondition": The system state required before the test. If none is required, output exactly "N/A".
  - Make sure the JSON is perfectly formatted. Do not include trailing commas.
  
  All ${requestedCount} test cases must be distinct and high-quality. Return ONLY the raw JSON object.
  ${requestedCount > 10 ? 'Keep descriptions and steps concise since you are generating a large number of cases.' : ''}`;

  try {
    const callLLM = async (tokenLimit) => {
      const message = await groq.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        max_tokens: tokenLimit,
        messages: [{ role: "user", content: prompt }]
      });
      return message;
    };

    let message = await callLLM(4000);
    let content = message.choices[0].message.content;
    const finishReason = message.choices[0].finish_reason;
    console.log(`[${new Date().toISOString()}] Raw LLM response (first 500 chars): ${content.substring(0, 500)}...`);
    console.log(`[${new Date().toISOString()}] Finish reason: ${finishReason}, content length: ${content.length}`);

    // If truncated, retry with higher token limit
    if (finishReason === 'length') {
      console.log(`[${new Date().toISOString()}] Response was truncated! Retrying with higher token limit...`);
      message = await callLLM(8000);
      content = message.choices[0].message.content;
      console.log(`[${new Date().toISOString()}] Retry response length: ${content.length}, finish_reason: ${message.choices[0].finish_reason}`);
    }
    
    let repaired;
    try {
      repaired = repairJsonString(content);
    } catch (repairError) {
      console.error(`[${new Date().toISOString()}] JSON repair error:`, repairError.message);
      console.error(`[${new Date().toISOString()}] Raw content length: ${content.length}`);
      throw repairError;
    }
    
    console.log(`[${new Date().toISOString()}] Attempting to parse repaired JSON (length: ${repaired.length})`);
    const result = JSON.parse(repaired);

    // Validate the result has actual test case content
    if (result.testCases && Array.isArray(result.testCases)) {
      const totalCases = result.testCases.reduce((sum, cat) => {
        if (cat.cases && Array.isArray(cat.cases)) return sum + cat.cases.length;
        if (cat.name || cat.id) return sum + 1; // flat format
        return sum;
      }, 0);
      console.log(`[${new Date().toISOString()}] Validated: ${totalCases} test cases found in response`);
      
      if (totalCases === 0) {
        throw new Error('AI generated empty test cases. This usually happens due to token limits. Please try with fewer categories.');
      }
    }

    result.ragContext = ragExamples.map(ex => ({
      id: ex.id, quality: ex.quality, text: ex.text ? ex.text.substring(0, 200) : "", relevanceScore: ex.score
    }));

    // Telemetry: Fire off to Langfuse
    await logTrace("TestCase Generation", feature, result);

    console.log(`[${new Date().toISOString()}] Test case generation complete`);
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    let errorMessage = 'Failed to generate test cases. Please try again later.';
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'Groq API key is not configured. Please set GROQ_API_KEY environment variable.';
      } else if (error.message.includes('No JSON found')) {
        errorMessage = `${error.message}. The model may not be returning valid JSON.`;
      } else if (error.message.includes('Unexpected token')) {
        errorMessage = 'Invalid JSON format returned from AI model. Try again.';
      } else {
        errorMessage = `Generation failed: ${error.message}`;
      }
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Generate test cases from image/mockup endpoint
app.post('/generate-test-cases-from-image', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Generating test cases from image`);

  // Get description from request body
  const description = req.body.description || req.body.feature || '';

  if (!description || description.trim().length < 3) {
    return res.status(400).json({ 
      error: 'Please provide a description of what you see in the mockup/screenshot.' 
    });
  }

  const prompt = `You are an expert QA test case generator. Based on the following description of a UI mockup/screenshot, generate comprehensive test cases.

MOCKUP DESCRIPTION:
"${description}"

Generate test cases that cover:
1. **Positive Test Cases** - Valid inputs and expected workflows
2. **Negative Test Cases** - Invalid inputs and error handling
3. **Boundary Value Analysis** - Edge cases and limits
4. **Coverage Analysis** - UI state transitions and interactions

IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations.

Return the response in this exact JSON format:
{
  "summary": "Brief summary of test cases generated",
  "testCases": [
    {
      "name": "Descriptive test case name",
      "precondition": "What needs to be set up before the test",
      "steps": "1) First step\\n2) Second step\\n3) Third step",
      "expectedResult": "What should happen after the steps",
      "postcondition": "State after the test completes"
    }
  ]
}

Generate 5-8 test cases covering various scenarios based on the mockup description.`;

  try {
    const message = await groq.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = message.choices[0].message.content;
    const result = JSON.parse(repairJsonString(content));

    // Validate response structure
    if (!result.testCases || !Array.isArray(result.testCases)) {
      throw new Error('Response missing or invalid testCases array');
    }

    console.log(`[${new Date().toISOString()}] Successfully generated ${result.testCases.length} test cases from image description`);
    
    // Telemetry: Fire off to Langfuse
    await logTrace("TestCase Generation from Image", description, result);
    
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /generate-test-cases-from-image:`, error.message);
    
    let errorMessage = 'Failed to generate test cases from mockup. Please provide a clearer description.';
    let statusCode = 500;
    
    if (error.message.includes('API key')) {
      errorMessage = 'Groq API key is not configured. Please set GROQ_API_KEY environment variable.';
    } else if (error.message.includes('ETIMEDOUT')) {
      errorMessage = 'Request timed out. The service may be overloaded.';
    } else if (error.message.includes('No JSON found')) {
      errorMessage = 'Model did not return valid test cases. Please try with a more detailed mockup description.';
    } else if (error.message.includes('parse')) {
      errorMessage = 'Failed to process model response. Try providing more specific UI element descriptions.';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Jira Integration Endpoint
app.post('/integration/jira/stories', async (req, res) => {
  const { domain, email, apiToken, projectKey } = req.body;
  console.log(`[${new Date().toISOString()}] Jira integration request for project: ${projectKey}`);

  if (!domain || !email || !apiToken || !projectKey) {
    return res.status(400).json({ error: 'Missing required fields: domain, email, apiToken, projectKey' });
  }

  try {
    const https = require('https');
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // Use the new /rest/api/3/search/jql endpoint with POST request
    const jqlQuery = `project = "${projectKey}" AND type in (Story, Task) ORDER BY created DESC`;
    const requestBody = JSON.stringify({
      jql: jqlQuery,
      maxResults: 50,
      fields: ['key', 'summary', 'description', 'status']
    });

    const options = {
      hostname: domain,
      port: 443,
      path: `/rest/api/3/search/jql`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error(`[${new Date().toISOString()}] Jira auth failed:`, response.data);
      return res.status(401).json({ 
        error: 'Failed to authenticate with Jira. Please verify your credentials.'
      });
    }

    if (response.status !== 200) {
      console.error(`[${new Date().toISOString()}] Jira error (${response.status}):`, response.data);
      return res.status(response.status).json({ 
        error: response.data.errorMessages?.[0] || `Jira API returned status ${response.status}`
      });
    }

    // Parse the stories from the response
    const stories = (response.data.issues || []).map(issue => {
      const description = issue.fields.description;
      let descriptionText = 'No description';
      
      // Handle Jira rich text format
      if (description) {
        if (description.content && Array.isArray(description.content)) {
          descriptionText = description.content
            .map(block => {
              if (block.content && Array.isArray(block.content)) {
                return block.content.map(item => item.text || '').join('');
              }
              return '';
            })
            .join(' ')
            .trim();
        } else if (typeof description === 'string') {
          descriptionText = description;
        }
      }

      return {
        key: issue.key,
        summary: issue.fields.summary || 'Untitled',
        description: descriptionText,
        status: issue.fields.status?.name || 'Unknown'
      };
    });

    console.log(`[${new Date().toISOString()}] Successfully fetched ${stories.length} stories from Jira`);
    res.json({ stories });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Jira error:`, error.message);
    res.status(500).json({ error: `Failed to connect to Jira: ${error.message}` });
  }
});

// Azure DevOps Integration Endpoint
app.post('/integration/azure/work-items', async (req, res) => {
  const { organization, project, personalAccessToken } = req.body;
  console.log(`[${new Date().toISOString()}] Azure DevOps integration request for project: ${project}`);

  if (!organization || !project || !personalAccessToken) {
    return res.status(400).json({ error: 'Missing required fields: organization, project, personalAccessToken' });
  }

  try {
    const https = require('https');
    const auth = Buffer.from(`:${personalAccessToken}`).toString('base64');

    // First, fetch the work items using WIQL
    const wiqlQuery = "Select [System.Id], [System.Title], [System.Description], [System.State] From WorkItems Where [System.TeamProject] = @project AND [System.WorkItemType] in ('User Story', 'Task') ORDER BY [System.CreatedDate] desc";

    const options = {
      hostname: 'dev.azure.com',
      port: 443,
      path: `/${organization}/${project}/_apis/wit/wiql?api-version=7.0`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify({ query: wiqlQuery }));
      req.end();
    });

    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error(`[${new Date().toISOString()}] Azure auth failed:`, response.data);
      return res.status(401).json({ 
        error: 'Failed to authenticate with Azure DevOps. Please verify your credentials.'
      });
    }

    if (response.status !== 200) {
      console.error(`[${new Date().toISOString()}] Azure error (${response.status}):`, response.data);
      return res.status(response.status).json({ 
        error: response.data.message || `Azure API returned status ${response.status}`
      });
    }

    // Transform the work items - Azure returns minimal data in WIQL, we need to fetch details
    const ids = (response.data.workItems || []).slice(0, 50).map(item => item.id);
    
    if (ids.length === 0) {
      return res.json({ workItems: [] });
    }

    // Fetch details for the work items
    const detailsOptions = {
      hostname: 'dev.azure.com',
      port: 443,
      path: `/${organization}/${project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.Id,System.Title,System.Description,System.State&api-version=7.0`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    };

    const detailsResponse = await new Promise((resolve, reject) => {
      const req = https.request(detailsOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            reject(new Error(`Failed to parse details response: ${e.message}`));
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (detailsResponse.status !== 200) {
      console.error(`[${new Date().toISOString()}] Azure details error (${detailsResponse.status}):`, detailsResponse.data);
      return res.status(detailsResponse.status).json({ 
        error: detailsResponse.data.message || `Azure Details API returned status ${detailsResponse.status}`
      });
    }

    // Helper to strip HTML
    const stripHtml = (html) => {
      if (!html) return '';
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p>/gi, '')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    };

    const workItems = (detailsResponse.data.value || []).map(item => ({
      id: item.id,
      title: item.fields?.['System.Title'] || 'Untitled',
      description: stripHtml(item.fields?.['System.Description']) || 'No description',
      status: item.fields?.['System.State'] || 'Unknown'
    }));

    console.log(`[${new Date().toISOString()}] Successfully fetched details for ${workItems.length} work items from Azure DevOps`);
    res.json({ workItems });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Azure error:`, error.message);
    res.status(500).json({ error: `Failed to connect to Azure DevOps: ${error.message}` });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v2-bulleted',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    model: MODEL,
    groq: !!groq
  });
});

// --- AGENTIC ENDPOINTS ---

app.post('/agentic/refine', async (req, res) => {
  const { artifact, type, findings, grade } = req.body;
  if (!agenticEngine) return res.status(503).json({ error: 'Agentic Engine not ready' });
  
  try {
    const result = await agenticEngine.refineArtifact(artifact, type, findings, grade);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/agentic/multi-agent-eval', async (req, res) => {
  const { artifact, type } = req.body;
  if (!agenticEngine) return res.status(503).json({ error: 'Agentic Engine not ready' });
  
  try {
    const result = await agenticEngine.multiAgentReview(artifact, type);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/agentic/chat', async (req, res) => {
  const { artifact, type, evaluation, userQuestion } = req.body;
  if (!agenticEngine) return res.status(503).json({ error: 'Agentic Engine not ready' });
  
  try {
    const result = await agenticEngine.chatResponse(artifact, type, evaluation, userQuestion);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint ${req.url} not found` });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\nBackend running on http://localhost:${PORT}`);
    console.log(`Using model: ${MODEL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

// Export the Express API for Vercel Serverless
module.exports = (req, res) => {
  return app(req, res);
};
