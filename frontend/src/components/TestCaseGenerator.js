import React, { useState } from 'react';
import { fetchWithRetry } from '../utils/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const AVAILABLE_TYPES = [
  { id: 'Positive',    label: 'Positive',    color: '#10b981' },
  { id: 'Negative',    label: 'Negative',    color: '#f43f5e' },
  { id: 'Edge Case',   label: 'Edge Case',   color: '#f59e0b' },
  { id: 'Boundary',    label: 'Boundary',    color: '#8b5cf6' },
  { id: 'Security',    label: 'Security',    color: '#06b6d4' },
  { id: 'Performance', label: 'Performance', color: '#6366f1' },
];

const TestCaseGenerator = ({ setServerBusy, onAnalyze }) => {
  const [feature, setFeature] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['Positive', 'Negative']);
  const [count, setCount] = useState(10);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleType = (id) => {
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (!feature.trim()) return;
    setLoading(true); setError(null);
    if (setServerBusy) setServerBusy(true);

    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/generate-test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, categories: selectedTypes, totalCount: count })
      }, 6, 10000);
      
      const data = await res.json();
      if (res.ok) setResults(data);
      else setError(data.error || 'Generation failed');
    } catch (err) {
      setError('Connection failed. Please check backend status.');
    } finally {
      setLoading(false);
      if (setServerBusy) setServerBusy(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e5e7f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
           <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect width="20" height="8" x="2" y="14" rx="2"/></svg>
           </div>
           <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a2e', margin: 0, textTransform: 'uppercase' }}>Feature Description</h3>
        </div>

        <textarea
          className="qa-textarea"
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          placeholder="Paste user story or feature description to generate test cases..."
          style={{ minHeight: 100 }}
        />

        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>Select Scenarios</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABLE_TYPES.map(type => {
              const active = selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, border: '1.5px solid',
                    borderColor: active ? type.color : '#e5e7f0',
                    background: active ? `${type.color}10` : 'transparent',
                    color: active ? type.color : '#64748b',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={loading || !feature.trim() || selectedTypes.length === 0}
            style={{ padding: '12px 32px', fontSize: '0.9rem', minWidth: 220, background: '#3b82f6' }}
          >
            {loading ? 'GENERATING...' : 'GENERATE TEST CASES'}
          </button>
        </div>
        {error && <div style={{ marginTop: 16, color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, background: '#fef2f2', padding: '10px 14px', borderRadius: 8, border: '1px solid #fecaca' }}>{error}</div>}
      </div>

      {results && (
        <div style={{ marginTop: 32 }}>
          {results.testCases.map((group, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: AVAILABLE_TYPES.find(t => t.id === group.category || group.category.includes(t.id))?.color || '#3b82f6' }} />
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{group.category}</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                {group.cases.map((tc, j) => (
                  <div key={j} style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7f0', transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#f8fafc', color: '#94a3b8', padding: '4px 10px', borderRadius: 8, border: '1px solid #e5e7f0' }}>TC-{i}-{j}</span>
                      <button 
                        onClick={() => onAnalyze(`${tc.name}\n\nSteps:\n${tc.steps}\n\nExpected Result:\n${tc.expectedResult}`)}
                        style={{ 
                          padding: '4px 10px', background: '#eff6ff', color: '#3b82f6', 
                          border: '1px solid #dbeafe', borderRadius: 6, fontSize: '0.65rem', 
                          fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        ANALYZE CASE
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{tc.name}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Steps</p>
                        <p style={{ fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {Array.isArray(tc.steps) ? tc.steps.join('\n') : tc.steps}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Expected Result</p>
                        <p style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {Array.isArray(tc.expectedResult) ? tc.expectedResult.join('\n') : tc.expectedResult}
                        </p>
                      </div>
                    </div>
                    {tc.analysis && (
                      <div style={{ marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                          {Object.entries(tc.analysis).filter(([k]) => k !== 'justification').map(([k, v], idx) => (
                            <div key={idx} style={{ flex: 1 }}>
                               <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{k}</p>
                               <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                                 <div style={{ width: `${(v/5)*100}%`, height: '100%', background: v >= 4 ? '#10b981' : '#3b82f6' }} />
                               </div>
                            </div>
                          ))}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>{tc.analysis.justification}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestCaseGenerator;
