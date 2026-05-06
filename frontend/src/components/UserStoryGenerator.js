import React, { useState } from 'react';
import { fetchWithRetry } from '../utils/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const UserStoryGenerator = ({ setServerBusy, onAnalyze }) => {
  const [feature, setFeature] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!feature.trim()) return;
    setLoading(true); setError(null);
    if (setServerBusy) setServerBusy(true);

    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/generate-user-stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature })
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
           <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect width="20" height="8" x="2" y="14" rx="2"/></svg>
           </div>
           <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a2e', margin: 0, textTransform: 'uppercase' }}>Feature or Epic Description</h3>
        </div>

        <textarea
          className="qa-textarea"
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          placeholder="Describe the high-level feature or epic you want to break down..."
          style={{ minHeight: 100 }}
        />

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={loading || !feature.trim()}
            style={{ padding: '12px 32px', fontSize: '0.9rem', minWidth: 200, background: '#10b981' }}
          >
            {loading ? 'GENERATING...' : 'GENERATE USER STORIES'}
          </button>
        </div>
        {error && <div style={{ marginTop: 16, color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}
      </div>

      {results && (
        <div style={{ marginTop: 32 }}>
          <div style={{ marginBottom: 20, padding: '14px 20px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>
              AI Summary: <span style={{ fontWeight: 500 }}>{results.summary}</span>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {results.userStories.map((story, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e5e7f0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: '#10b981' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1a1a2e' }}>{story.name}</h4>
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#f0fdf4', color: '#10b981', padding: '4px 10px', borderRadius: 12, border: '1px solid #bbf7d0' }}>{story.storyPoints} POINTS</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.6, marginBottom: 16, background: '#f8fafc', padding: 16, borderRadius: 12 }}>{story.description}</p>
                {story.analysis && (
                  <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>INVEST ANALYSIS</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {Object.entries(story.analysis).filter(([k]) => k !== 'justification').map(([k, v], idx) => (
                        <div key={idx} style={{ flex: 1, textAlign: 'center', background: '#fff', padding: '6px 0', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8' }}>{k[0].toUpperCase()}</p>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: v >= 4 ? '#10b981' : '#f59e0b' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>"{story.analysis.justification}"</p>
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                   <button 
                     onClick={() => onAnalyze(story.description)}
                     style={{ 
                       padding: '6px 14px', background: '#f5f3ff', color: '#6366f1', 
                       border: '1px solid #e0deff', borderRadius: 8, fontSize: '0.75rem', 
                       fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                     }}
                   >
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                     ANALYZE THIS STORY
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStoryGenerator;
