const fs = require('fs');

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace RAG Context section with new collapsible block
  const oldRag = `              {/*  RAG Context (Reference Examples)  */}
              {result.ragContext && result.ragContext.length > 0 && (
                <div style={{ padding: 24, borderRadius: 16, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#475569', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                     Reference Examples <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#94a3b8', textTransform: 'none' }}>(from Knowledge Base)</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>`;
                  
  const newRag = `              </div>
            )}
          </div>

          {/*  Reference Examples Section  */}
          {result.ragContext && result.ragContext.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #edf2f7', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: isRefCollapsed ? 'none' : '1px solid #edf2f7', cursor: 'pointer', background: '#f8fafc' }}
                onClick={() => setIsRefCollapsed(!isRefCollapsed)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 8, background: '#e2e8f0',
                    color: '#475569', fontSize: '0.9rem', transition: 'all 0.2s',
                    transform: isRefCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                  }}></span>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                     Reference Examples <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#94a3b8', textTransform: 'none' }}>(from Knowledge Base)</span>
                  </h2>
                </div>
              </div>
              {!isRefCollapsed && (
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>`;

  content = content.replace(oldRag, newRag);

  const oldAi = `                    ))}
                  </div>
                </div>
              )}
              {/*  AGENTIC ENHANCEMENTS  */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>`;

  const newAi = `                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/*  AI Helper Section  */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #edf2f7', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: isAiCollapsed ? 'none' : '1px solid #edf2f7', cursor: 'pointer', background: '#f8fafc' }}
              onClick={() => setIsAiCollapsed(!isAiCollapsed)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: 8, background: '#e2e8f0',
                  color: '#475569', fontSize: '0.9rem', transition: 'all 0.2s',
                  transform: isAiCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                }}></span>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                   AI Helper
                </h2>
              </div>
            </div>
            {!isAiCollapsed && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>`;

  content = content.replace(oldAi, newAi);

  const oldEnd = `                </div>
              </div>
            </div>
          )}
        </>`;

  const newEnd = `                  </div>
                </div>
              </div>
            )}
          </div>
        </div>`;

  content = content.replace(oldEnd, newEnd);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', filePath);
}

refactorFile('e:/Domi/GenAi/VS Solution/US Evaluator/frontend/src/components/TestCaseEvaluator.js');
