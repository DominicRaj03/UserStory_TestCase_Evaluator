const fs = require('fs');

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add state variables
  content = content.replace(
    /const \[isResultsCollapsed, setIsResultsCollapsed\] = useState\(false\);\s*const \[isInputCollapsed, setIsInputCollapsed\] = useState\(false\);/,
    `const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);\n  const [isAiCollapsed, setIsAiCollapsed] = useState(false);\n  const [isInputCollapsed, setIsInputCollapsed] = useState(false);`
  );

  // 2. Add AI Helper section block before Agentic Enhancements
  const oldAi = `              {/*  Agentic Enhancements  */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>`;

  const newAi = `            </div>
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

  // 3. Fix the closing brackets
  const oldEnd = `                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>`;

  const newEnd = `                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>`;

  content = content.replace(oldEnd, newEnd);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', filePath);
}

refactorFile('e:/Domi/GenAi/VS Solution/US Evaluator/frontend/src/components/UserStoryEvaluator.js');
