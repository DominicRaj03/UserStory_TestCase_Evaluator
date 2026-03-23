const { Pinecone } = require('@pinecone-database/pinecone');

let pineconeIndex = null;

function getIndex() {
  if (!pineconeIndex) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      console.warn("PINECONE_API_KEY is not configured.");
      return null;
    }
    const pc = new Pinecone({ apiKey });
    pineconeIndex = pc.Index(process.env.PINECONE_INDEX || 'qa-evaluator');
  }
  return pineconeIndex;
}

async function getEmbedding(text) {
  const url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";
  
  let embedding = new Array(768).fill(0.1); // Fallback mock 
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: [text] }),
    });

    if (res.ok) {
        const data = await res.json();
        // Extract flat list from nested HF arrays
        if (Array.isArray(data) && Array.isArray(data[0])) {
            if (Array.isArray(data[0][0])) {
                embedding = data[0][0];
            } else {
                embedding = data[0];
            }
        }
    }
  } catch (err) {
    console.warn("HuggingFace Inference API failed, using fallback embeddings.", err.message);
  }

  const targetDim = parseInt(process.env.PINECONE_DIMENSION || '768');
  if (embedding.length < targetDim) {
    embedding = [...embedding, ...new Array(targetDim - embedding.length).fill(0.0)];
  }
  return embedding.slice(0, targetDim);
}

async function retrieve(queryText, entryType = null, topK = 3) {
  try {
    const index = getIndex();
    if (!index) return [];

    const queryEmbedding = await getEmbedding(queryText);
    const filterDict = entryType ? { type: { "$eq": entryType } } : undefined;

    const results = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
      filter: filterDict
    });

    const retrieved = [];
    if (results.matches) {
        for (const match of results.matches) {
            if (match.score > 0.3) {
                retrieved.push({
                    id: match.id,
                    score: match.score.toFixed(3),
                    type: match.metadata?.type,
                    quality: match.metadata?.quality,
                    text: match.metadata?.text,
                    explanation: match.metadata?.explanation
                });
            }
        }
    }
    return retrieved;
  } catch (err) {
    console.warn("RAG retrieval failed (non-fatal):", err.message);
    return [];
  }
}

function formatRagContext(examples, entryType) {
  if (!examples || examples.length === 0) return "";

  const label = entryType === "user_story" ? "user stories" : "test cases";
  let lines = [`\n--- REFERENCE EXAMPLES (from knowledge base of ${label}) ---`];

  examples.forEach((ex, i) => {
    const qualityTag = `[${(ex.quality || "UNKNOWN").toUpperCase()} QUALITY]`;
    lines.push(`\nExample ${i + 1} ${qualityTag}:`);
    lines.push(`  Input: ${ex.text}`);
    lines.push(`  Why: ${ex.explanation}`);
  });
  
  lines.push("\n--- Use these examples as calibration references when scoring. ---\n");
  return lines.join("\n");
}

module.exports = { retrieve, formatRagContext, getEmbedding };
