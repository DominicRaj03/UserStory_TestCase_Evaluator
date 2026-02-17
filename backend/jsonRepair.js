/**
 * Advanced JSON repair function to handle malformed JSON from LLM responses
 */
function repairJsonString(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input is not a valid string');
  }
  
  let s = input.trim();
  console.log(`[${new Date().toISOString()}] [JSON Repair] Started with input length: ${s.length}`);

  // Step 1: Remove markdown code block wrappers
  s = s.replace(/^```[\s\S]*?```$/gm, '').trim();
  if (s.length === 0) {
    throw new Error('Input contains only code block markers, no actual content');
  }

  // Step 2: Replace smart quotes with standard quotes
  s = s.replace(/['""]/g, (match) => {
    if (match === '"' || match === '"') return '"';
    if (match === "'" || match === "'") return "'";
    return match;
  });

  // Step 3: Remove JS/C-style comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  // Step 4: Extract JSON object or array
  let extracted = extractJsonFromText(s);
  if (!extracted) {
    throw new Error('No JSON object or array found in LLM response');
  }
  
  s = extracted;
  console.log(`[${new Date().toISOString()}] [JSON Repair] Extracted JSON (first 100 chars): ${s.substring(0, 100)}`);

  // Step 5: Fix common JSON issues
  s = fixJsonIssues(s);

  // Step 6: Try to parse and if it fails, attempt recovery
  try {
    JSON.parse(s);
    console.log(`[${new Date().toISOString()}] [JSON Repair] JSON parsed successfully`);
    return s;
  } catch (parseError) {
    console.log(`[${new Date().toISOString()}] [JSON Repair] Parse failed, attempting recovery`);
    s = recoverJson(s, parseError);
  }

  console.log(`[${new Date().toISOString()}] [JSON Repair] Repair completed`);
  return s;
}

/**
 * Extract the first valid JSON object or array from text
 */
function extractJsonFromText(text) {
  // Find all potential JSON objects and arrays
  const objects = [];
  
  // Find all strings that look like JSON objects
  let braceCount = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (braceCount === 0) start = i;
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0 && start !== -1) {
        objects.push(text.substring(start, i + 1));
      }
    }
  }

  // Find all strings that look like JSON arrays
  let bracketCount = 0;
  start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      if (bracketCount === 0) start = i;
      bracketCount++;
    } else if (text[i] === ']') {
      bracketCount--;
      if (bracketCount === 0 && start !== -1) {
        objects.push(text.substring(start, i + 1));
      }
    }
  }

  // Return the longest one (most likely to be the main JSON)
  if (objects.length === 0) return null;
  return objects.reduce((max, curr) => curr.length > max.length ? curr : max);
}

/**
 * Fix common JSON syntax issues
 */
function fixJsonIssues(json) {
  let result = json;

  // Fix unquoted keys (but be careful not to break URLs or strings)
  result = result.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Remove trailing commas before } or ]
  result = result.replace(/,\s*([}\]])/g, '$1');

  // Fix missing commas between items in arrays  
  result = result.replace(/(\])\s*(\{|\[)/g, '$1,$2');
  result = result.replace(/(\})\s*(\{|\[)/g, '$1,$2');

  // Remove any HTML or Markdown-like content
  result = result.replace(/<[^>]+>/g, '');
  result = result.replace(/\*\*/g, '');
  result = result.replace(/~~([^~]*)~~/g, '$1');

  return result;
}

/**
 * Attempt to recover JSON by finding the longest valid substring
 */
function recoverJson(json, parseError) {
  console.log(`[${new Date().toISOString()}] [JSON Repair] Recovery attempt - original error at position ${parseError.message}`);

  const stack = [];
  let depth = 0;
  
  try {
    // Try to find the deepest valid JSON by progressively removing from the end
    for (let i = json.length; i > 10; i--) {
      try {
        const candidate = json.substring(0, i);
        // Try to make it valid by adding closing braces
        const openBraces = (candidate.match(/\{/g) || []).length;
        const closeBraces = (candidate.match(/\}/g) || []).length;
        const toAdd = openBraces > closeBraces ? '}'.repeat(openBraces - closeBraces) : '';
        
        const test = candidate + toAdd;
        JSON.parse(test);
        console.log(`[${new Date().toISOString()}] [JSON Repair] Found valid JSON at length ${test.length}`);
        return test;
      } catch {
        // Continue trying
      }
    }
  } catch (e) {
    // Last resort failed
  }

  throw new Error(`Unable to recover valid JSON from input. Last error: ${parseError.message}`);
}

module.exports = { repairJsonString };
