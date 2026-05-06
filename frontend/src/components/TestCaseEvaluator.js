import React, { useState } from 'react';
import IntegrationPanel from './IntegrationPanel';
import RefinementPanel from './agentic/RefinementPanel';
import MultiAgentDashboard from './agentic/MultiAgentDashboard';
import AgentChat from './agentic/AgentChat';
import { fetchWithRetry } from '../utils/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const ChevronIcon = ({ isOpen }) => (
  <svg 
    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const StarIcon = ({ fill }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={fill ? '#f59e0b' : 'none'} stroke={fill ? '#f59e0b' : '#d1d5db'} strokeWidth="2">
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const SectionHeader = ({ title, icon, isCollapsed, onToggle }) => (
  <div 
    onClick={onToggle}
    style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '14px 20px', background: '#f8fafc', borderRadius: 12, 
      cursor: 'pointer', marginBottom: 12, border: '1px solid #e2e8f0' 
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
    </div>
    <ChevronIcon isOpen={!isCollapsed} />
  </div>
);

const TestCaseEvaluator = ({ setServerBusy, initialValue }) => {
  const [testCase, setTestCase] = useState(initialValue || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [runDeepEval, setRunDeepEval] = useState(false);
  const [collapsed, setCollapsed] = useState({ params: false, recs: false, agentic: false });

  React.useEffect(() => {
    if (initialValue) setTestCase(initialValue);
  }, [initialValue]);

  const handleEvaluate = async () => {
    if (!testCase.trim()) return;
    setLoading(true); setError(null);
    if (setServerBusy) setServerBusy(true);

    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/evaluate-test-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCase, runDeepEval })
      }, 6, 10000, (retriesLeft) => {
        setError(`Server waking up... (${retriesLeft} retries left)`);
      });
      
      const data = await res.json();
      if (res.ok) setResults(data);
      else setError(data.error || 'Evaluation failed');
    } catch (err) {
      setError('Connection failed. Please check backend status.');
    } finally {
      setLoading(false);
      if (setServerBusy) setServerBusy(false);
    }
  };

  const getHealthColor = (val) => {
    if (val >= 90) return '#10b981';
    if (val >= 70) return '#3b82f6';
    if (val >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const renderStars = (score) => {
    const filled = Math.round(score);
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map(i => <StarIcon key={i} fill={i <= filled} />)}
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, alignItems: 'start' }}>
        <IntegrationPanel onSelectStory={setTestCase} setServerBusy={setServerBusy} />

        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e5e7f0', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
               </div>
               <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a2e', margin: 0, textTransform: 'uppercase' }}>Manual Entry</h3>
               <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: 10, border: '1px solid #e2e8f0' }}>{testCase.length}/2000</span>
            </div>
            <button onClick={() => { setTestCase(''); setResults(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>CLEAR</button>
          </div>

          <textarea
            className="qa-textarea"
            value={testCase}
            onChange={(e) => setTestCase(e.target.value)}
            placeholder="Steps, Expected Results, Preconditions..."
            style={{ flex: 1, minHeight: 180 }}
          />

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="deepEvalTC" checked={runDeepEval} onChange={e => setRunDeepEval(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#3b82f6' }} />
              <label htmlFor="deepEvalTC" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', cursor: 'pointer' }}>Run DeepEval (RAG)</label>
            </div>
            <button 
              className="btn-primary" 
              onClick={handleEvaluate} 
              disabled={loading || !testCase.trim()}
              style={{ padding: '12px 32px', fontSize: '0.9rem', minWidth: 180, background: '#3b82f6' }}
            >
              {loading ? 'ANALYZING...' : 'EVALUATE'}
            </button>
          </div>
          {error && <div style={{ marginTop: 16, color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, background: '#fef2f2', padding: '10px 14px', borderRadius: 8, border: '1px solid #fecaca' }}>{error}</div>}
        </div>
      </div>

      {results && (
        <div style={{ marginTop: 32 }}>
          {/* Health Dashboard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {results.metrics && Object.entries(results.metrics).map(([key, val], i) => (
              <div key={i} style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #e5e7f0', textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>{key}</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 950, color: getHealthColor(val), margin: 0 }}>{val}%</p>
                <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${val}%`, height: '100%', background: getHealthColor(val), transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7f0' }}>
              <SectionHeader 
                title="Evaluation Criteria" 
                isCollapsed={collapsed.params} 
                onToggle={() => setCollapsed({...collapsed, params: !collapsed.params})}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>}
              />
              {!collapsed.params && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.parameters.map((p, i) => (
                    <div key={i} style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#1a1a2e' }}>{p.name}</span>
                        {renderStars(p.score)}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>{p.findings}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7f0' }}>
              <SectionHeader 
                title="Improvement Plan" 
                isCollapsed={collapsed.recs} 
                onToggle={() => setCollapsed({...collapsed, recs: !collapsed.recs})}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M12 2v20"/><path d="M2 12h20"/><path d="m17 7 5 5-5 5"/><path d="m7 7-5 5 5 5"/></svg>}
              />
              {!collapsed.recs && (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {results.recommendations.map((r, i) => (
                    <li key={i} style={{ marginBottom: 10, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7f0' }}>
              <SectionHeader 
                title="DeepEval Metrics" 
                isCollapsed={!runDeepEval} 
                onToggle={() => {}}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>}
              />
              {runDeepEval && results.deepEvalMetric && typeof results.deepEvalMetric === 'object' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {Object.entries(results.deepEvalMetric).map(([key, val], i) => (
                     <div key={i} style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>{key}</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <span style={{ fontSize: '0.65rem', fontWeight: 900, color: val?.passed ? '#10b981' : '#ef4444', background: val?.passed ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: 4 }}>{val?.passed ? 'PASS' : 'FAIL'}</span>
                           <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#3b82f6' }}>{((val?.score || 0) * 100).toFixed(1)}%</span>
                         </div>
                       </div>
                       <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.4, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>{val?.reason || 'No reason provided'}</p>
                     </div>
                   ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: 20 }}>RAG metrics were not enabled.</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <SectionHeader 
              title="Agentic QA Collaboration" 
              isCollapsed={collapsed.agentic} 
              onToggle={() => setCollapsed({...collapsed, agentic: !collapsed.agentic})}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>}
            />
            {!collapsed.agentic && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  {(() => {
                    const fallbackScore = results.parameters?.reduce((sum, p) => sum + (Number(p.score) || 0), 0) || 0;
                    const finalScore = results.totalScore || fallbackScore;
                    const needsRefinement = finalScore < 23 || (results.metrics && (results.metrics.faithfulness < 90 || results.metrics.coverage < 90));
                    
                    return needsRefinement ? (
                      <RefinementPanel 
                        original={testCase} 
                        type="test_case" 
                        findings={results.parameters.map(p => p.findings).join(' ')} 
                        grade={finalScore >= 20 ? "B" : finalScore >= 15 ? "C" : "D"} 
                        onApply={(refined) => { setTestCase(refined); setResults(null); }}
                      />
                    ) : (
                      <div style={{ marginTop: 24, padding: 20, background: '#f0fdf4', borderRadius: 16, border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                         </div>
                         <div>
                           <p style={{ margin: 0, fontWeight: 800, color: '#1e40af', fontSize: '0.9rem' }}>Exceptional Test Coverage Verified</p>
                           <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e3a8a' }}>This test case demonstrates superior clarity and traceability. No further autonomous refinement needed.</p>
                         </div>
                      </div>
                    );
                  })()}
                  <MultiAgentDashboard artifact={testCase} type="test_case" />
                </div>
                <AgentChat artifact={testCase} type="test_case" evaluation={results} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCaseEvaluator;
