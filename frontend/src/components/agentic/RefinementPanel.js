import React, { useState } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const RefinementPanel = ({ original, type, findings, grade, onApply }) => {
  const [loading, setLoading] = useState(false);
  const [refined, setRefined] = useState(null);
  const [error, setError] = useState(null);

  const handleRefine = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/agentic/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact: original, type, findings, grade })
      });
      const data = await response.json();
      if (response.ok) {
        setRefined(data);
      } else {
        setError(data.error || 'Refinement failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 24, padding: 24, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="m12 3 1.912 5.886h6.19l-5.007 3.638 1.912 5.886L12 14.772l-5.007 3.638 1.912-5.886L3.898 8.886h6.19L12 3z"/></svg>
          Autonomous Refinement
        </h4>
        {!refined && (
          <button 
            onClick={handleRefine} 
            disabled={loading}
            style={{ 
              padding: '8px 16px', background: '#4f46e5', color: '#fff', 
              border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20"/><path d="m5 15 7 7 7-7"/></svg>
            {loading ? 'Refining...' : 'Auto-Fix Artifact'}
          </button>
        )}
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}

      {refined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1.5px solid #10b981' }}>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10b981', marginBottom: 8 }}>REFINED VERSION:</p>
            <p style={{ fontSize: '0.9rem', color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap' }}>
              {refined.refinedContent || 'No refined content returned from AI.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Improvements:</p>
              <ul style={{ paddingLeft: 18, fontSize: '0.8rem', color: '#475569' }}>
                {Array.isArray(refined.improvementsMade) ? (
                  refined.improvementsMade.map((imp, i) => <li key={i}>{imp}</li>)
                ) : (
                  <li>Refinement process completed successfully.</li>
                )}
              </ul>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Estimated Grade:</p>
              <span style={{ fontSize: '1.5rem', fontWeight: 950, color: '#10b981' }}>{refined.estimatedNewGrade || 'A'}</span>
              <p style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: 2 }}>Subject to re-evaluation</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => refined.refinedContent && onApply && onApply(refined.refinedContent.substring(0, 10000))}
              disabled={!refined.refinedContent}
              style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !refined.refinedContent ? 0.5 : 1 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
              Apply Fix {(refined.refinedContent?.length || 0) > 10000 && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Truncated)</span>}
            </button>
            <button 
              onClick={() => setRefined(null)}
              style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefinementPanel;
