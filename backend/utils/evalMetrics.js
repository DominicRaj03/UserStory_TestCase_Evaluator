const { repairJsonString } = require('../jsonRepair');

async function runDeepEvalMetricsMock(groq, model, textToEvaluate) {
  const prompt = `You are an strict LLM judge calculating DeepEval-style quality metrics. 
Evaluate the following text and assign continuous scores from 0.0 to 1.0 for each metric, along with a reason and boolean passed status (threshold 0.7).

TEXT: "${textToEvaluate}"

Evaluate these 3 metrics:
1. Faithfulness: Does it make logical sense without hallucination?
2. Contextual Relevancy: Is it highly relevant to software engineering requirements?
3. Answer Relevancy: Is it a complete and direct artifact?

Respond ONLY with a JSON object exactly like this:
{
  "Faithfulness": { "score": 0.9, "passed": true, "reason": "Because..." },
  "Contextual Relevancy": { "score": 0.8, "passed": true, "reason": "Because..." },
  "Answer Relevancy": { "score": 0.85, "passed": true, "reason": "Because..." }
}
`;

  try {
    const message = await groq.chat.completions.create({
      model: model,
      response_format: { type: "json_object" },
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    });

    const parsed = JSON.parse(repairJsonString(message.choices[0].message.content));
    return parsed;
  } catch (e) {
    console.warn("DeepEval fallback failed:", e.message);
    return null;
  }
}

module.exports = { runDeepEvalMetricsMock };
