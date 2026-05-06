require('dotenv').config({path: '.env.local'});
const { logTrace } = require('./utils/observability');

async function test() {
  const userStory = "As a user I want to navigate to the dashboard so I can see my profile stats directly on screen.";
  
  const result = {
    totalScore: 25,
    parameters: [
      { name: "Independent", score: 4, findings: "Good" },
      { name: "Negotiable", score: 5, findings: "Good" },
      { name: "Valuable", score: 5, findings: "Good" },
      { name: "Estimable", score: 4, findings: "Good" },
      { name: "Small", score: 3, findings: "Good" },
      { name: "Testable", score: 4, findings: "Good" }
    ],
    grade: "B",
    recommendations: ["Rec 1", "Rec 2"],
    ragContext: [
      { id: "us_001", quality: "excellent", text: "Related story context...", relevanceScore: 0.92 }
    ],
    deepEvalMetric: {
      "Faithfulness": { score: 0.92, passed: true, reason: "Consistent" },
      "Hallucination": { score: 0.95, passed: true, reason: "No false info" },
      "Contextual Precision": { score: 0.85, passed: true, reason: "Precise" },
      "Contextual Recall": { score: 0.73, passed: false, reason: "Missing niche details" },
      "Answer Relevancy": { score: 0.92, passed: true, reason: "Relevant" },
      "Answer Correctness": { score: 0.88, passed: true, reason: "Correct" }
    }
  };

  const mappedScores = {};
  result.parameters.forEach(p => mappedScores[p.name] = parseFloat((Number(p.score) / 5.0).toFixed(4)));
  Object.entries(result.deepEvalMetric).forEach(([k, v]) => mappedScores[k] = parseFloat(Number(v?.score || 0).toFixed(4)));

  console.log("Sending trace with scores:", JSON.stringify(mappedScores, null, 2));
  
  const outcome = await logTrace("UserStory Evaluation Debug", userStory, result, mappedScores);
  console.log("Outcome:", outcome);
}

test();
