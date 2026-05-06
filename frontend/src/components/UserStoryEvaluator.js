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

const SectionHeader = ({ title, icon, isCollapsed, onToggle }) => (
  <div 
    onClick={onToggle}
    style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '14px 20px', background: '#f8fafc', borderRadius: 12, 
      cursor: 'pointer', marginBottom: 12, border: '1px solid #e2e8f0', transition: 'all 0.2s' 
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
    </div>
    <ChevronIcon isOpen={!isCollapsed} />
  </div>
);

const UserStoryEvaluator = ({ setServerBusy, initialValue }) => {
  const [userStory, setUserStory] = useState(initialValue || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [runDeepEval, setRunDeepEval] = useState(false);
  const [collapsed, setCollapsed] = useState({ criteria: false, recs: false, agentic: false });

  React.useEffect(() => {
    if (initialValue) setUserStory(initialValue);
  }, [initialValue]);

  const handleEvaluate = async () => {
    if (!userStory.trim()) return;
    setLoading(true); setError(null);
    if (setServerBusy) setServerBusy(true);

    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userStory, runDeepEval })
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

  const getScoreColor = (score) => {
    if (score >= 27) return '#10b981';
    if (score >= 22) return '#3b82f6';
    if (score >= 16) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, alignItems: 'start' }}>
        <IntegrationPanel onSelectStory={setUserStory} setServerBusy={setServerBusy} />

        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e5e7f0', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
               </div>
               <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a2e', margin: 0, textTransform: 'uppercase' }}>Manual Entry</h3>
               <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: 10, border: '1px solid #e2e8f0' }}>{userStory.length}/2000</span>
            </div>
            <button onClick={() => { setUserStory(''); setResults(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>CLEAR</button>
          </div>

          <textarea
            className="qa-textarea"
            value={userStory}
            onChange={(e) => setUserStory(e.target.value)}
            placeholder="As a [user type], I want [goal] so that [reason]..."
            style={{ flex: 1, minHeight: 180 }}
          />

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="deepEval" checked={runDeepEval} onChange={e => setRunDeepEval(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#6366f1' }} />
              <label htmlFor="deepEval" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', cursor: 'pointer' }}>Run DeepEval (RAG)</label>
            </div>
            <button 
              className="btn-primary" 
              onClick={handleEvaluate} 
              disabled={loading || !userStory.trim()}
              style={{ padding: '12px 32px', fontSize: '0.9rem', minWidth: 180 }}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 24, marginBottom: 24 }}>
            <div style={{ background: getScoreColor(results.totalScore), borderRadius: 20, padding: 32, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>OVERALL GRADE</span>
              <span style={{ fontSize: '4.5rem', fontWeight: 950, lineHeight: 1 }}>{results.grade}</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, marginTop: 8 }}>{results.totalScore}/30</span>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7f0' }}>
              <SectionHeader 
                title="INVEST Criteria Analysis" 
                isCollapsed={collapsed.criteria} 
                onToggle={() => setCollapsed({...collapsed, criteria: !collapsed.criteria})}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M12 2v20"/><path d="m5 15 7 7 7-7"/><path d="m5 9 7 7 7-7"/><path d="m5 3 7 7 7-7"/></svg>}
              />
              {!collapsed.criteria && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {results.investOverview && (
                    <div style={{ padding: 16, borderRadius: 16, background: '#f5f3ff', border: '1.5px solid #c7d2fe', marginBottom: 4 }}>
                       <p style={{ margin: 0, fontSize: '0.85rem', color: '#4338ca', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                         <strong style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Overview Analysis:</strong>
                         {results.investOverview}
                       </p>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {results.parameters.map((p, i) => (
                      <div key={i} style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>{p.name}</span>
                          <span style={{ fontWeight: 900, fontSize: '0.85rem', color: getScoreColor(p.score * 6) }}>{p.score}/5</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{p.findings}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7f0' }}>
              <SectionHeader 
                title="Recommendations" 
                isCollapsed={collapsed.recs} 
                onToggle={() => setCollapsed({...collapsed, recs: !collapsed.recs})}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="m12 3 1.912 5.886h6.19l-5.007 3.638 1.912 5.886L12 14.772l-5.007 3.638 1.912-5.886L3.898 8.886h6.19L12 3z"/></svg>}
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
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>}
              />
              {runDeepEval && results.deepEvalMetric && typeof results.deepEvalMetric === 'object' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                   {Object.entries(results.deepEvalMetric).map(([key, val], i) => (
                     <div key={i} style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>{key}</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <span style={{ fontSize: '0.65rem', fontWeight: 900, color: val?.passed ? '#10b981' : '#ef4444', background: val?.passed ? '#ecfdf5' : '#fef2f2', padding: '2px 6px', borderRadius: 4 }}>{val?.passed ? 'PASS' : 'FAIL'}</span>
                           <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#6366f1' }}>{((val?.score || 0) * 100).toFixed(1)}%</span>
                         </div>
                       </div>
                       <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.4, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>{val?.reason || 'No reason provided'}</p>
                     </div>
                   ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: 20 }}>RAG metrics were not enabled for this run.</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <SectionHeader 
              title="Agentic AI Analysis" 
              isCollapsed={collapsed.agentic} 
              onToggle={() => setCollapsed({...collapsed, agentic: !collapsed.agentic})}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>}
            />
            {!collapsed.agentic && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  {(results.grade !== 'A' || results.totalScore < 27) ? (
                    <RefinementPanel 
                      original={userStory} 
                      type="user_story" 
                      findings={results.parameters.map(p => p.findings).join(' ')} 
                      grade={results.grade} 
                      onApply={(refined) => { setUserStory(refined); setResults(null); }}
                    />
                  ) : (
                    <div style={{ marginTop: 24, padding: 20, background: '#f0fdf4', borderRadius: 16, border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                       </div>
                       <div>
                         <p style={{ margin: 0, fontWeight: 800, color: '#166534', fontSize: '0.9rem' }}>High Quality Artifact Detected</p>
                         <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d' }}>This user story meets the highest quality standards. Autonomous refinement is currently locked to preserve integrity.</p>
                       </div>
                    </div>
                  )}
                  <MultiAgentDashboard artifact={userStory} type="user_story" />
                </div>
                <AgentChat artifact={userStory} type="user_story" evaluation={results} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStoryEvaluator;