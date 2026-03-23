const fs = require('fs');
const p = 'backend/server.js';
let s = fs.readFileSync(p, 'utf8');

// We want to add response_format parameter if it doesn't already exist.
s = s.replace(/model: MODEL,/g, 'model: MODEL,\n      response_format: { type: "json_object" },');

fs.writeFileSync(p, s);
console.log('Successfully updated server.js with response_format!');
