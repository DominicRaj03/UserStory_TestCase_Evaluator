const fs = require('fs');
const path = require('path');

function sanitize(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      sanitize(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Replace non-ASCII characters with a space or empty string
      // except for valid characters we want to keep (which are none in this case as we want pure ASCII)
      const sanitized = content.replace(/[^\x00-\x7F]/g, '');
      if (content !== sanitized) {
        fs.writeFileSync(fullPath, sanitized, 'utf8');
        console.log(`Sanitized: ${fullPath}`);
      }
    }
  });
}

sanitize('e:/Domi/GenAi/VS Solution/US Evaluator/frontend/src');
sanitize('e:/Domi/GenAi/VS Solution/US Evaluator/frontend/public');
console.log('Cleanup complete.');
