try {
  const app = require('../server.js');
  module.exports = app;
} catch (err) {
  console.error('[Vercel Boot Error] require(../server.js) failed:', err.message);
  console.error('Current __dirname:', __dirname);
  const fs = require('fs');
  const path = require('path');
  try {
    const parentFiles = fs.readdirSync(path.join(__dirname, '..'));
    console.error('Files in parent directory:', parentFiles);
  } catch (fsErr) {
    console.error('Failed to list parent directory:', fsErr.message);
  }
  throw err;
}