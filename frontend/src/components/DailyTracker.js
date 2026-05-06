import React, { useState, useEffect } from 'react';
import { getDailyStats } from '../utils/analyticsTracker';

const DailyTracker = () => {
  const [stats, setStats] = useState({ totalToday: 0, userStories: 0, testCases: 0, timeSavedHrs: '0.0', averageScore: 0, history: [] });

  useEffect(() => {
    // Load initial stats
    setStats(getDailyStats());
    
    // Set up an interval to refresh stats every 5 seconds just in case they evaluate in another tab
    const interval = setInterval(() => {
      setStats(getDailyStats());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="content-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Live Daily Tracker</h2>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Real-time telemetry of your AI evaluation sessions today.</p>
        </div>
        <div style={{ background: '#ecfdf5', padding: '8px 16px', borderRadius: '20px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#047857', letterSpacing: '0.05em' }}>LIVE RECORDING</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Total Artifacts Today</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#3b82f6' }}>{stats.totalToday}</div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Artifact Breakdown</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
             <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#8b5cf6' }}>{stats.userStories} <span style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa' }}>US</span></div>
             <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f43f5e' }}>{stats.testCases} <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fb7185' }}>TC</span></div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Time Reclaimed</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>{stats.timeSavedHrs}<span style={{ fontSize: '1.2rem', color: '#34d399', marginLeft: 4 }}>hrs</span></div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Average Quality Score</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b' }}>{stats.averageScore}%</div>
        </div>
      </div>

      {/* History Log */}
      <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Evaluation Log</h3>
        </div>
        
        {stats.history.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16, opacity: 0.5 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No evaluations tracked yet.</p>
            <p style={{ fontSize: '0.8rem' }}>Run a User Story or Test Case evaluation to see live data here.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Artifact Type</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Snippet</th>
                <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Score / Grade</th>
                <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>DeepEval</th>
              </tr>
            </thead>
            <tbody>
              {stats.history.map((entry, idx) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{entry.time}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800,
                      background: entry.type === 'User Story' ? '#ede9fe' : '#ffe4e6',
                      color: entry.type === 'User Story' ? '#8b5cf6' : '#f43f5e'
                    }}>
                      {entry.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: '#64748b', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.artifactPreview}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{entry.score} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {entry.maxScore}</span></span>
                      <span style={{ 
                        fontSize: '0.65rem', fontWeight: 900, padding: '2px 6px', borderRadius: 4,
                        background: entry.grade === 'A' ? '#ecfdf5' : entry.grade === 'B' ? '#eff6ff' : '#fffbeb',
                        color: entry.grade === 'A' ? '#10b981' : entry.grade === 'B' ? '#3b82f6' : '#f59e0b'
                      }}>
                        GRADE {entry.grade}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    {entry.deepEval === 'Enabled' ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg> RAG</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Disabled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DailyTracker;
