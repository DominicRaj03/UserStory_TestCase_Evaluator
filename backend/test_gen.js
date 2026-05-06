require('dotenv').config({path: '.env.local'});
const { retrieve } = require('./utils/ragEngine');
const { repairJsonString } = require('./jsonRepair');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function formatRagContext(examples, type) {
  if (!examples || examples.length === 0) return "";
  const header = type === "user_story" ? "USER STORY EXAMPLES" : "TEST CASE EXAMPLES";
  let context = `\\n\\n--- START ${header} (Use these as stylistic references) ---\\n`;
  examples.forEach((ex, i) => {
    context += `Example ${i + 1} [${ex.quality.toUpperCase()} QUALITY]:\\n${ex.text}\\n\\n`;
  });
  context += `--- END ${header} ---\\n`;
  return context;
}

async function test() {
  const feature = 'To improve security and reduce password fatigue';
  
  const ragExamples = await retrieve(feature, "user_story", 3);
  const ragContext = await formatRagContext(ragExamples, "user_story");

  const prompt = `You are an expert Agile Product Owner. Break down this feature/epic into smaller, highly actionable User Stories:

FEATURE DESCRIPTION:
"${feature}"
${ragContext}

CRITICAL: You must respond with ONLY a valid JSON object in the exact structure below. Do not use markdown blocks:
{
  "summary": "Brief summary of the feature breakdown strategy",
  "userStories": [
    {
      "name": "Short descriptive title",
      "description": "As a [type of user], I want [some goal] so that [some reason]",
      "acceptanceCriteria": ["AC 1", "AC 2"],
      "storyPoints": 3
    }
  ]
}

Ensure you generate at least 3 distinct user stories. Return ONLY the raw JSON object.`;

  try {
    console.log("Calling Groq API...");
    const message = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: "json_object" },
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    console.log("Groq responded");
    const content = message.choices[0].message.content;
    const repaired = repairJsonString(content);
    console.log('Success:', JSON.parse(repaired));
  } catch(e) { 
    console.error('Error:', e.message); 
    if (e.error?.error?.message) {
      console.error('Detailed Error:', e.error.error.message);
    }
  }
}
test();
