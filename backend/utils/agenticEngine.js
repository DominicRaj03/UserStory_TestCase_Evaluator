const { repairJsonString } = require('../jsonRepair');

/**
 * Orchestrates specialized agentic tasks using the Groq LLM.
 */
class AgenticEngine {
  constructor(groq, model) {
    this.groq = groq;
    this.model = model;
  }

  /**
   * Refines a User Story or Test Case based on previous evaluation findings.
   */
  async refineArtifact(original, type, findings, grade) {
    const prompt = `
      You are an expert ${type === 'user_story' ? 'Product Owner' : 'QA Engineer'}.
      
      ORIGINAL ${type.toUpperCase()}:
      "${original}"
      
      PREVIOUS EVALUATION (Grade: ${grade}):
      ${JSON.stringify(findings)}
      
      TASK:
      You must rewrite the ${type.replace('_', ' ')} to achieve a PERFECT Grade A (Score 27-30) across all criteria.
      - ADDRESS EVERY SINGLE NEGATIVE FINDING mentioned in the evaluation logs.
      - If it's a User Story, ensure it perfectly meets ALL 6 INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable).
      - If it's a Test Case, ensure total clarity, full requirements traceability, and zero ambiguity in expected results.
      - Preserve all existing high-quality elements.
      
      CRITICAL CONSTRAINTS:
      - The "refinedContent" MUST contain ONLY the corrected ${type.replace('_', ' ')} text.
      - The "estimatedNewGrade" should be your honest assessment of the new content (e.g., "A").
      
      Return ONLY a JSON object in this format:
      {
        "refinedContent": "string (The core artifact text ONLY)",
        "improvementsMade": ["string", "string"],
        "estimatedNewGrade": "string"
      }
    `;

    return this._callLLM(prompt);
  }

  /**
   * Performs a multi-perspective review using 3 distinct agent roles.
   */
  async multiAgentReview(artifact, type) {
    const isTestCase = type === 'test_case';
    
    const perspectives = isTestCase 
      ? `1. Product Owner (PO): Focus on whether this specific test case accurately reflects a realistic user scenario and aligns with business goals. Evaluate this SINGLE test case on its own merit within its defined scope. Do NOT penalize it or ask for a broader range of user scenarios, as those belong in separate test cases.
      2. QA Lead (QA): Focus on the quality of the steps, preconditions, and expected results. Evaluate this SINGLE test case on its own merit within its defined scope. Do NOT penalize it for missing negative scenarios, edge cases, or broader coverage, as those belong in separate test cases.
      3. Security Analyst (SEC): Focus on whether the test data or steps expose sensitive information improperly in a testing environment, and if the specific scenario handles its scope securely. Do NOT complain about missing security coverage if it's out of scope for this specific test case.`
      
      : `1. Product Owner (PO): Focus on business value, clarity of intent, and user impact.
      2. Technical Lead (Lead): Focus on testability and missing high-level requirements. Do NOT penalize the user story for failing to contain explicit test cases or edge cases, as those are defined separately during the QA phase.
      3. Security Analyst (SEC): Focus on potential security vulnerabilities or compliance risks (PII, Auth, etc.) introduced by this feature. Do NOT penalize it for lacking technical implementation details like specific authentication mechanisms, as user stories are meant to be high-level requirements.`;

    const prompt = `
      Analyze this ${type.replace('_', ' ')}: "${artifact}"
      
      Perform a review from 3 distinct perspectives:
      ${perspectives}
      
      Return ONLY a JSON object in this format:
      {
        "poReview": { "verdict": "Pass/Fail/Needs Work", "feedback": "string" },
        "qaReview": { "verdict": "Pass/Fail/Needs Work", "feedback": "string" },
        "secReview": { "verdict": "Pass/Fail/Needs Work", "feedback": "string" },
        "consensus": "string"
      }
    `;

    return this._callLLM(prompt);
  }

  /**
   * Handles a contextual chat question about an evaluation.
   */
  async chatResponse(artifact, type, evaluation, userQuestion) {
    const prompt = `
      You are the "QA AI Assistant". You just evaluated this ${type.replace('_', ' ')}:
      
      ARTIFACT: "${artifact}"
      EVALUATION: ${JSON.stringify(evaluation)}
      
      USER QUESTION: "${userQuestion}"
      
      Provide a helpful, professional answer using Markdown for formatting (e.g., **bold**, *italics*, bullet points, numbered lists).
      Ensure you use double newlines between paragraphs and sections to guarantee superior readability.
      If the user asks how to improve, provide specific, actionable examples in a bulleted list.
    `;

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000
      });
      return { response: completion.choices[0].message.content };
    } catch (err) {
      throw new Error(`Chat failed: ${err.message}`);
    }
  }

  async _callLLM(prompt) {
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000
      });
      return JSON.parse(repairJsonString(completion.choices[0].message.content));
    } catch (err) {
      throw new Error(`Agentic call failed: ${err.message}`);
    }
  }
}

module.exports = AgenticEngine;
