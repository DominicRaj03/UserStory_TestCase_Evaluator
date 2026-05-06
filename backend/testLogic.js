const fs = require('fs');

const resultStr = `{
  "testCases": [
      {
         "category": "Positive Test Cases",
         "cases": [
            { "id": "TC_001", "name": "Valid" },
            { "id": "TC_002", "name": "Valid 2" }
         ]
      }
  ]
}`;

const result = JSON.parse(resultStr);

let totalCases = 0;
if (result.testCases && Array.isArray(result.testCases)) {
  totalCases = result.testCases.reduce((sum, cat) => {
    if (cat.cases && Array.isArray(cat.cases)) return sum + cat.cases.length;
    if (cat.name || cat.id) return sum + 1; // flat format
    return sum;
  }, 0);
}

console.log("Total Cases:", totalCases);
