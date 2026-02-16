const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'US Evaluator API is running',
    endpoints: {
      health: '/health',
      evaluate: 'POST /evaluate',
      evaluateTestCase: 'POST /evaluate-test-case',
      generateTestCases: 'POST /generate-test-cases',
      generateTestCasesFromImage: 'POST /generate-test-cases-from-image'
    }
  });
});

const PORT = process.env.PORT || 5000;
const MODEL = process.env.MODEL || 'mixtral-8x7b-32768';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Check if API key is configured
if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
  console.error('ERROR: GROQ_API_KEY environment variable is not set!');
  console.error('Please set GROQ_API_KEY in your environment or .env file');
}

// Initialize Groq client
const groq = new Groq({
  apiKey: GROQ_API_KEY
});

console.log(`[${new Date().toISOString()}] Server starting...`);
console.log(`[${new Date().toISOString()}] Model: ${MODEL}`);
console.log(`[${new Date().toISOString()}] API Key configured: ${!!GROQ_API_KEY}`);

// Repair common JSON issues returned by LLM (quotes, trailing commas, unquoted keys, comments, unbalanced braces)
function repairJsonString(input) {
  if (!input || typeof input !== 'string') return input;
  let s = input.trim();

  // Trim surrounding non-json text
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    s = s.substring(firstBrace, lastBrace + 1);
  }

  // Replace smart quotes with standard quotes
  s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

  // Remove JS/C-style comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  // Replace single quoted strings with double quotes
  s = s.replace(/'([^']*)'/g, '"$1"');

  // Ensure property names are quoted: { key: becomes { "key":
  s = s.replace(/([{,\s])(\w+)\s*:/g, '$1"$2":');

  // Remove trailing commas before object/array closers
  s = s.replace(/,\s*([}\]])/g, '$1');

  // Remove any leading/trailing ellipses or stray characters
  s = s.replace(/^[^\{\[]+/, '').replace(/[^\}\]]+$/, '');

  // Balance braces by appending closing braces if needed
  const openBraces = (s.match(/\{/g) || []).length;
  const closeBraces = (s.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    s += '}'.repeat(openBraces - closeBraces);
  }
  if (closeBraces > openBraces) {
    // Try to remove extra closing braces at the end
    while ((s.match(/\{/g) || []).length < (s.match(/\}/g) || []).length) {
      s = s.replace(/\}\s*$/, '');
    }
  }

  return s;
}


// Input validation middleware
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

// Calculate health metrics based on evaluation parameters
function calculateHealthMetrics(parameters) {
  // Extract individual parameter scores (1-5 scale)
  const scoreMap = {};
  parameters.forEach(param => {
    scoreMap[param.name] = param.score;
  });

  // Convert 1-5 scale to 0-100% scale
  const convertScore = (score) => (score / 5) * 100;

  // Map evaluation criteria to health metrics
  const faithfulness = convertScore(scoreMap['Requirements Traceability'] || 3);
  const coverage = convertScore(scoreMap['Coverage'] || 3);
  const compliance = convertScore(scoreMap['Accuracy'] || 3); // Use accuracy as proxy for compliance
  const executionRate = convertScore(scoreMap['Completeness'] || 3); // Use completeness as proxy for execution rate

  return {
    'Faithfulness': Math.round(faithfulness),
    'Coverage': Math.round(coverage),
    'Compliance': Math.round(compliance),
    'Execution Rate': Math.round(executionRate)
  };
}

app.post('/evaluate', validateUserStory, async (req, res) => {
  const { userStory } = req.body;
  console.log(`[${new Date().toISOString()}] Evaluating user story of ${userStory.length} characters`);

  const prompt = `
    Analyze this User Story: "${userStory}"
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
      "totalScore": number, // sum of all 6 criteria (max 30)
      "parameters": [
        { "name": "Independent", "score": number, "findings": "string" },
        { "name": "Negotiable", "score": number, "findings": "string" },
        { "name": "Valuable", "score": number, "findings": "string" },
        { "name": "Estimable", "score": number, "findings": "string" },
        { "name": "Small", "score": number, "findings": "string" },
        { "name": "Testable", "score": number, "findings": "string" }
      ],
      "grade": "A" | "B" | "C" | "D", // A: 27-30, B: 22-26, C: 16-21, D: 6-15
      "recommendations": ["string", "string", "string"]
    }
  `;

  try {
    const message = await groq.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    console.log(`[${new Date().toISOString()}] Groq API response received`);
    
    if (!message.content || !message.content[0]) {
      throw new Error('Invalid response structure from Groq API');
    }
    
    const content = message.content[0].text;
    console.log(`[${new Date().toISOString()}] Response content (first 500 chars):`, content.substring(0, 500));
    
    const repaired = repairJsonString(content);
    console.log(`[${new Date().toISOString()}] Repaired JSON (first 500 chars):`, repaired.substring(0, 500));
    
    const result = JSON.parse(repaired);

    console.log(`[${new Date().toISOString()}] Evaluation complete - Score: ${result.totalScore}`);
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in /evaluate:`, error.message);
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
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message
    });
  }
});

// Test case evaluation endpoint
app.post('/evaluate-test-case', validateTestCase, async (req, res) => {
  const { testCase } = req.body;
  console.log(`[${new Date().toISOString()}] Evaluating test case of ${testCase.length} characters`);

  const prompt = `
    Analyze this Test Case: "${testCase}"
      Evaluate it based on the following criteria:
      1. Clarity: Are the steps easy to understand and follow?
      2. Requirements Traceability: Do test cases cover all requirements?
      3. Accuracy: Are the expected results precise and realistic?
      4. Completeness: Are preconditions and postconditions defined?
      5. Coverage: Are negative, edge, and valid scenarios included?
      For each criterion, assign a score from 1 (poor) to 5 (excellent) and provide a brief breakdown. Only assign a score of 5 if ALL aspects are fully met. If any aspect is missing or unclear, reduce the score accordingly. Be critical and realistic in your assessment.
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
    const message = await groq.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = message.content[0].text;
    const result = JSON.parse(repairJsonString(content));

    console.log(`[${new Date().toISOString()}] Test case evaluation complete - Score: ${result.totalScore}`);
    
    // Calculate health metrics based on the evaluation parameters
    const healthMetrics = calculateHealthMetrics(result.parameters);
    
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

// Health check endpoint
app.get('/health', (req, res) => {
  const apiKeyConfigured = !!GROQ_API_KEY && GROQ_API_KEY.trim() !== '';
  res.json({ 
    status: 'OK', 
    model: MODEL,
    apiKeyConfigured: apiKeyConfigured,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test case generation endpoint
app.post('/generate-test-cases', async (req, res) => {
  const { feature } = req.body;
  console.log(`[${new Date().toISOString()}] Generating test cases for feature of ${feature?.length || 0} characters`);

  if (!feature || feature.trim().length < 5) {
    return res.status(400).json({ error: 'Feature description must be at least 5 characters' });
  }

  const prompt = `Generate comprehensive test cases for the following feature/functionality: "${feature}".

You MUST return EXACTLY one pure JSON object and NOTHING else (no markdown, no explanations, no code fences). If you are unable to produce valid JSON, respond with the exact token: INVALID_JSON_RESPONSE

The JSON must follow this exact schema:
{
  "testCases": [
    {
      "category": "Positive Test Cases",
      "cases": [
        {
          "name": "Test case name",
          "description": "Brief description",
          "precondition": "Precondition/Setup",
          "testData": "Input data to use",
          "steps": ["Step 1", "Step 2", "Step 3"],
          "expectedResult": "Expected outcome",
          "riskLevel": "Low"
        }
      ]
    },
    { "category": "Negative Test Cases", "cases": [] },
    { "category": "Boundary Value Analysis", "cases": [] },
    { "category": "Coverage Analysis", "cases": [] }
  ],
  "testData": [
    { "field": "Field name", "validData": "Valid example", "invalidData": "Invalid example", "expectedBehavior": "Accept/Reject", "errorMessage": "Error message if applicable" }
  ],
  "errorHandling": ["Network failures", "Invalid inputs", "Expired sessions", "Timeouts", "DB connection issues"],
  "summary": "Total test cases generated: X. Coverage: Y%. Key focus areas: Z"
}`;


  try {
    const message = await groq.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = message.content[0].text;
    const result = JSON.parse(repairJsonString(content));

    console.log(`[${new Date().toISOString()}] Test case generation complete`);
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    
    let errorMessage = 'Failed to generate test cases. Please try again later.';
    
    if (error.message.includes('API key')) {
      errorMessage = 'Groq API key is not configured. Please set GROQ_API_KEY environment variable.';
    } else if (error.message.includes('No JSON found')) {
      errorMessage = `${error.message}. The model may not be returning valid JSON.`;
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
    const message = await groq.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = message.content[0].text;
    const result = JSON.parse(repairJsonString(content));

    // Validate response structure
    if (!result.testCases || !Array.isArray(result.testCases)) {
      throw new Error('Response missing or invalid testCases array');
    }

    console.log(`[${new Date().toISOString()}] Successfully generated ${result.testCases.length} test cases from image description`);
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
    const workItems = (response.data.workItems || []).slice(0, 50).map(item => ({
      id: item.id,
      title: item.fields?.['System.Title'] || 'Untitled',
      description: item.fields?.['System.Description'] || 'No description',
      status: item.fields?.['System.State'] || 'Unknown'
    }));

    console.log(`[${new Date().toISOString()}] Successfully fetched ${workItems.length} work items from Azure DevOps`);
    res.json({ workItems });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Azure error:`, error.message);
    res.status(500).json({ error: `Failed to connect to Azure DevOps: ${error.message}` });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Using model: ${MODEL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});