const { repairJsonString } = require('./jsonRepair');

const content = `{
  "testCases": [
    {
      "category": "Positive Test Cases",
      "cases": [
        { "id": "TC_001", "name": "Valid Azure AD Credentials", "description": "Login with valid Azure AD credentials", "precondition": "N/A", "testData": "username: user1, password: pass", "steps": ["Open the QA Evaluator Tool login page", "Enter the valid username and password", "Click the login button"], "expectedResult": "User is successfully logged in", "riskLevel": "Low" },
        { "id": "TC_002", "name": "Multi-Factor Authentication", "description": "Login with valid Azure AD credentials and MFA", "precondition": "N/A", "testData": "username: user1, password: pass, MFA code: 123456", "steps": ["Open the QA Evaluator Tool login page", "Enter the valid username and password", "Select MFA option and enter MFA code", "Click the login button"], "expectedResult": "User is successfully logged in with MFA", "riskLevel": "Medium" },
        { "id": "TC_003", "name": "Azure AD Tenant Change", "description": "Login with valid Azure AD credentials from a different tenant", "precondition": "N/A", "testData": "username: user2, password: pass", "steps": ["Open the QA Evaluator Tool login page", "Enter the valid username and password", "Select the different Azure AD tenant", "Click the login button"], "expectedResult": "User is successfully logged in from different tenant", "riskLevel": "High" }
      ]
    },
    {
      "category": "Negative Test Cases",
      "cases": [
        { "id": "TC_004", "name": "Invalid Username", "description": "Login with invalid username", "precondition": "N/A", "testData": "username: invalid, password: pass", "steps": ["Open the QA Evaluator Tool login page", "Enter the invalid username and password", "Click the login button"], "expectedResult": "Error message is displayed for invalid username", "riskLevel": "Medium" },
        { "id": "TC_005", "name": "Invalid Password", "description": "Login with invalid password", "precondition": "N/A", "testData": "username: user1, password: invalid", "steps": ["Open the QA Evaluator Tool login page", "Enter the valid username and invalid password", "Click the login button"], "expectedResult": "Error message is displayed for invalid password", "riskLevel": "Medium" },
        { "id": "TC_006", "name": "Locked Account", "description": "Login with locked Azure AD account", "precondition": "N/A", "testData": "username: user1, password: pass", "steps": ["Open the QA Evaluator Tool login page", "Enter the locked username and password", "Click the login button"], "expectedResult": "Error message is displayed for locked account", "riskLevel": "High" }
      ]
    }
  ],
  "summary": "This test suite covers both positive and negative testing scenarios to ensure the QA Evaluator Tool login functionality works as expected."
}`;

console.log("Testing JSON repair on valid JSON:");
const repaired = repairJsonString(content);
const parsed = JSON.parse(repaired);
console.log("Parsed keys:", Object.keys(parsed));
console.log("Total Cases via logic:", parsed.testCases.reduce((sum, cat) => sum + (cat.cases ? cat.cases.length : 0), 0));
