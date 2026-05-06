const { repairJsonString } = require('./jsonRepair');

const input = `{
  "summary": "This is a summary",
  "userStories": [
    { "name": "Story 1" }
  ]
}`;

try {
  const rep = repairJsonString(input);
  console.log("Repaired:", rep);
} catch(e) { console.error("Repair Error:", e.message); }
