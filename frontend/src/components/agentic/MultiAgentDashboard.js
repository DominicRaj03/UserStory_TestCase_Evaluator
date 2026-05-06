import React, { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const BriefcaseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const LockIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;

const MultiAgentDashboard = ({ artifact, type }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/agentic/multi-agent-eval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifact, type })
        });
        const data = await response.json();
        if (response.ok) setReport(data);
        else setError(data.error);
      } catch (err) {
        setError('Failed to fetch multi-agent review');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [artifact, type]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div className="spinner-dark" style={{ margin: '0 auto' }}></div>
      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 10 }}>Agents are deliberating...</p>
    </div>
  );
  
  if (error) return <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>Error: {error}</div>;
  if (!report) return null;

  const roles = [
    { key: 'poReview', label: 'Product Owner', icon: <BriefcaseIcon />, color: '#3b82f6' },
    { key: 'qaReview', label: type === 'user_story' ? 'Technical Lead' : 'QA Lead', icon: <ShieldIcon />, color: '#10b981' },
    { key: 'secReview', label: 'Security Analyst', icon: <LockIcon />, color: '#f59e0b' }
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ fontSize: '1rem', fontWeight: 850, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SearchIcon />
        Multi-Agent Perspectives
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {roles.map(role => {
          const review = report[role.key] || { verdict: 'Unknown', feedback: 'Deliberation incomplete.' };
          return (
            <div key={role.key} style={{ 
              background: '#fff', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                <div style={{ color: role.color }}>{role.icon}</div>
                <span style={{ 
                  fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', 
                  padding: '4px 8px', borderRadius: 6,
                  background: review.verdict === 'Pass' ? '#dcfce7' : '#fee2e2',
                  color: review.verdict === 'Pass' ? '#166534' : '#991b1b'
                }}>{review.verdict}</span>
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: 4 }}>{role.label}</p>
              <p style={{ fontSize: '0.8rem', color: '#1e293b', lineHeight: 1.5, margin: 0 }}>{review.feedback}</p>
            </div>
          );
        })}
      </div>
      <div style={{ 
        marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 12, 
        borderLeft: '4px solid #4f46e5', fontSize: '0.85rem', color: '#475569' 
      }}>
        <strong>Final Consensus:</strong> {report.consensus}
      </div>
    </div>
  );
};

export default MultiAgentDashboard;
