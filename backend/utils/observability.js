const crypto = require('crypto');
function uuidv4() { return crypto.randomUUID(); }

async function logTrace(name, inputText, outputData, scores = null) {
  const secretKey = (process.env.LANGFUSE_SECRET_KEY || "").trim();
  const publicKey = (process.env.LANGFUSE_PUBLIC_KEY || "").trim();
  const baseUrl = (process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com").trim().replace(/\/$/, '');

  console.log(`[${new Date().toISOString()}]  Langfuse logTrace called for: "${name}"`);
  console.log(`[${new Date().toISOString()}]   publicKey: ${publicKey ? publicKey.substring(0, 8) + '...' : 'MISSING'}`);
  console.log(`[${new Date().toISOString()}]   secretKey: ${secretKey ? secretKey.substring(0, 8) + '...' : 'MISSING'}`);
  console.log(`[${new Date().toISOString()}]   baseUrl: ${baseUrl}`);

  if (!secretKey || !publicKey) {
    console.warn(`[${new Date().toISOString()}]  Langfuse skipped: Missing keys.`);
    return { success: false, reason: 'missing_keys' };
  }

  try {
    const traceId = uuidv4();
    const nowTs = new Date().toISOString();

    // Safe stringifier to handle potential BigInts, NaNs, or Infinities in LLM responses
    const safeStringify = (obj) => JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'number' && isNaN(value)) return null;
      if (typeof value === 'number' && !isFinite(value)) return null;
      return value;
    }));

    const traceEvent = {
      id: uuidv4(),
      type: "trace-create",
      timestamp: nowTs,
      body: {
        id: traceId,
        timestamp: nowTs,
        name: name,
        input: { text: typeof inputText === 'string' ? inputText.substring(0, 1000) : JSON.stringify(inputText).substring(0, 500) },
        output: typeof outputData === 'object' ? safeStringify(outputData) : { text: String(outputData) },
        metadata: { source: "qa-evaluator", version: "1.1", traceName: name }
      }
    };

    const batchEvents = [traceEvent];

    if (scores && typeof scores === 'object') {
      for (const [sName, sVal] of Object.entries(scores)) {
        if (typeof sVal === 'number' && !isNaN(sVal)) {
          batchEvents.push({
            id: uuidv4(),
            type: "score-create",
            timestamp: nowTs,
            body: {
              id: uuidv4(),
              traceId: traceId,
              name: sName,
              value: parseFloat(Number(sVal).toFixed(4)),
              comment: `System generated score for ${sName}`
            }
          });
        }
      }
    }

    const payload = { batch: batchEvents };
    const authToken = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

    const endpoint = `${baseUrl}/api/public/ingestion`;
    console.log(`[${new Date().toISOString()}]  Langfuse Ingestion Start: ${name} (${batchEvents.length} events)`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authToken}`,
        "Content-Type": "application/json",
        "x-langfuse-sdk-name": "manual-fetch",
        "x-langfuse-sdk-version": "1.1.0"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`[${new Date().toISOString()}]  Langfuse API Failure [${response.status}]: ${responseText.substring(0, 500)}`);
      return { success: false, status: response.status, body: responseText.substring(0, 200) };
    }

    console.log(`[${new Date().toISOString()}]  Langfuse Trace Ingested: ${name} [ID: ${traceId}]`);
    return { success: true, traceId, status: response.status };

  } catch (e) {
    console.error(`[${new Date().toISOString()}]  Langfuse error:`, e.message);
    return { success: false, error: e.message };
  }
}

// Diagnostic function to test Langfuse connectivity
async function testLangfuseConnection() {
  const secretKey = (process.env.LANGFUSE_SECRET_KEY || "").trim();
  const publicKey = (process.env.LANGFUSE_PUBLIC_KEY || "").trim();
  const baseUrl = (process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com").trim().replace(/\/$/, '');

  const diagnostics = {
    publicKeySet: !!publicKey,
    publicKeyPreview: publicKey ? publicKey.substring(0, 10) + '...' : null,
    secretKeySet: !!secretKey,
    secretKeyPreview: secretKey ? secretKey.substring(0, 10) + '...' : null,
    baseUrl: baseUrl,
    timestamp: new Date().toISOString()
  };

  if (!publicKey || !secretKey) {
    diagnostics.status = 'FAIL';
    diagnostics.reason = 'Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY';
    return diagnostics;
  }

  try {
    // Test with a minimal health-style request
    const authToken = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
    const testPayload = {
      batch: [{
        id: uuidv4(),
        type: "trace-create",
        timestamp: new Date().toISOString(),
        body: {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          name: "connection-test",
          input: { text: "Langfuse connectivity test from QA Evaluator" },
          output: { text: "OK" },
          metadata: { test: true }
        }
      }]
    };

    const endpoint = `${baseUrl}/api/public/ingestion`;
    diagnostics.endpoint = endpoint;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testPayload)
    });

    const responseBody = await response.text();
    diagnostics.httpStatus = response.status;
    diagnostics.httpStatusText = response.statusText;
    diagnostics.responseBody = responseBody.substring(0, 500);
    diagnostics.status = response.ok ? 'OK' : 'FAIL';

    if (!response.ok) {
      diagnostics.reason = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
    }
  } catch (e) {
    diagnostics.status = 'FAIL';
    diagnostics.reason = e.message;
    diagnostics.errorType = e.constructor.name;
  }

  return diagnostics;
}

module.exports = { logTrace, testLangfuseConnection };
