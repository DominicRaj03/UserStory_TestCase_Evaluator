const fs = require('fs');
const content = `{
  "testCases": [
    {
      "category": "Positive Test Cases",
      "cases": [
        { "id": "TC_001", "name": "Valid Azure AD Credentials", "description": "Login with valid Azure AD credentials", "precondition": "N/A", "testData": "username: user1, password: pass", "steps": ["Open the QA Evaluator Tool login page", "Enter the valid username and password", "Click the login button"], "expectedResult": "User is successfully logged in", "riskLevel": "Low" }
      ]
    }
  ]
}`;

function fixJsonIssues(json) {
  let result = json;

  // Fix unquoted keys (but be careful not to break URLs or strings)
  result = result.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Remove trailing commas before } or ]
  result = result.replace(/,\s*([}\]])/g, '$1');

  // Fix TypeScript-style union values like "Low" | "Medium" | "High"  keep first value
  result = result.replace(/"([^"]+)"\s*\|\s*"[^"]*"(\s*\|\s*"[^"]*")*/g, '"$1"');

  // Fix missing commas between items in arrays  
  result = result.replace(/(\])\s*(\{|\[)/g, '$1,$2');
  result = result.replace(/(\})\s*(\{|\[)/g, '$1,$2');

  // Remove any HTML or Markdown-like content
  result = result.replace(/<[^>]+>/g, '');
  result = result.replace(/\*\*/g, '');
  result = result.replace(/~~([^~]*)~~/g, '$1');

  return result;
}

const fixed = fixJsonIssues(content);
console.log(fixed);
