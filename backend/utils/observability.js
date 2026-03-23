const { v4: uuidv4 } = require('uuid');

async function logTrace(name, inputText, outputData, scores = null) {
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";

  if (!secretKey || !publicKey) return;

  try {
    const traceId = uuidv4();
    const nowTs = new Date().toISOString();

    const traceEvent = {
      id: uuidv4(),
      type: "trace-create",
      timestamp: nowTs,
      body: {
        id: traceId,
        name: name,
        input: { text: inputText },
        output: outputData
      }
    };

    const batchEvents = [traceEvent];

    if (scores) {
      for (const [sName, sVal] of Object.entries(scores)) {
        batchEvents.push({
          id: uuidv4(),
          type: "score-create",
          timestamp: nowTs,
          body: {
            id: uuidv4(),
            traceId: traceId,
            name: sName,
            value: sVal
          }
        });
      }
    }

    const payload = { batch: batchEvents };
    const authHeaders = {
      "Authorization": "Basic " + Buffer.from(`${publicKey}:${secretKey}`).toString("base64"),
      "Content-Type": "application/json"
    };

    fetch(`${baseUrl.replace(/\/$/, '')}/api/public/ingestion`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload)
    }).catch(e => console.warn("Langfuse background HTTP reporting failed:", e.message));

  } catch (e) {
    console.warn("Langfuse trace creation failed:", e.message);
  }
}

module.exports = { logTrace };
