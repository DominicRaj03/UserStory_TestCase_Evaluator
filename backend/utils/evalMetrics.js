const { repairJsonString } = require('../jsonRepair');

async function runDeepEvalMetricsMock(groq, model, textToEvaluate) {
  const prompt = `You are a CRITICAL and UNBIASED LLM judge calculating DeepEval-style quality metrics for software engineering artifacts (User Stories or Test Cases).
Evaluate the following text and assign a continuous score from 0.0 to 1.0 for each metric, a reason, and a boolean passed status (threshold = 0.7).

CRITICAL SCORING RULES:
1. BE EXTREMELY STRICT. High scores (0.9+) are only for industry-standard, perfect artifacts.
2. CORRELATION: Your numerical score MUST match your reasoning. If you identify a "gap", "ambiguity", "missing detail", or "generic description", you MUST deduct significant points.
3. PENALTIES: 
   - Deduct 0.2 to 0.4 for any ambiguity (e.g., referencing a "dashboard" or "session token" without prior context).
   - Deduct 0.15 for lack of technical specificity.
   - Deduct 0.3 if the artifact is too generic or lacks clear acceptance criteria/steps.
4. If the score is below 0.7, "passed" MUST be false.

TEXT TO EVALUATE: 
"${textToEvaluate}"

METRIC DEFINITIONS:
1. Faithfulness: Is the content logically consistent and grounded? Does it avoid made-up facts or assumptions not present in the requirement?
2. Hallucination: Does it introduce false, fabricated, or contradictory information? (High score = low hallucination).
3. Contextual Precision: Are the details precise and specific to the software engineering context?
4. Contextual Recall: Does it cover all expected aspects of a complete software artifact (Preconditions, Steps, Expected Results)?
5. Answer Relevancy: Is it a complete and directly relevant software artifact?
6. Answer Correctness: Is the content factually and structurally correct for its artifact type?

Respond ONLY with a JSON object exactly like this (no markdown, no extra text):
{
  "Faithfulness": { "score": 0.65, "passed": false, "reason": "Deducted 0.25 because it assumes a dashboard exists without definition..." },
  "Hallucination": { "score": 0.85, "passed": true, "reason": "..." },
  "Contextual Precision": { "score": 0.55, "passed": false, "reason": "..." },
  "Contextual Recall": { "score": 0.75, "passed": true, "reason": "..." },
  "Answer Relevancy": { "score": 0.90, "passed": true, "reason": "..." },
  "Answer Correctness": { "score": 0.82, "passed": true, "reason": "..." }
}
`;

  try {
    const message = await groq.chat.completions.create({
      model: model,
      temperature: 0.0,
      response_format: { type: "json_object" },
      max_tokens: 2000,
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
