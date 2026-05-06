import React, { useState } from 'react';
import { fetchWithRetry } from '../utils/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const InfoIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
const PencilIcon = () => <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>;
const JiraIcon = () => <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor"><path d="M11.53 2c0 2.4-1.97 4.35-4.35 4.35h-5C1 6.35 0 7.32 0 8.53v5.04c0 1.2.98 2.18 2.18 2.18h5.04c2.4 0 4.35-1.95 4.35-4.35V2zm7.14 7.15c0 2.4-1.97 4.35-4.35 4.35h-4.99c-1.2 0-2.18.98-2.18 2.18v5.05c0 1.2.98 2.18 2.18 2.18h5.04c2.4 0 4.35-1.95 4.35-4.35v-9.41zm5.33 5.31c0 2.4-1.97 4.35-4.35 4.35h-4.99c-1.2 0-2.18.98-2.18 2.18v5.03c0 1.2.98 2.18 2.18 2.18h5.04c2.4 0 4.35-1.95 4.35-4.35v-9.39z"/></svg>;
const AzureIcon = () => <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 4.44l4.23-2.9 3.03 2.16L6.5 8.94V4.44zM18.8 19.33l-5.63 2.91-4.14-2.8 6.09-4.7 3.68 4.59zM22.06 13.9l-2.73 4.95-6.56-5.11 5.92-4.59 3.37.81v3.94zm-14-64L13.5 12 7.7 16.5l-5.77-1.39V5l6.13 2.5z"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>;
const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;

const IntegrationPanel = ({ onSelectStory, onSelectTestCase, setServerBusy }) => {
  const [mode, setMode]               = useState('manual');
  const [jiraConfig, setJiraConfig]   = useState({ domain: '', email: '', apiToken: '', projectKey: '' });
  const [azureConfig, setAzureConfig] = useState({ organization: '', project: '', personalAccessToken: '' });
  const [stories, setStories]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [connStatus, setConnStatus]   = useState(null);
  const [dismissed, setDismissed]     = useState(false);

  const handleJiraConnect = async () => {
    const { domain, email, apiToken, projectKey } = jiraConfig;
    if (!domain || !email || !apiToken || !projectKey) { setError('All fields required'); return; }
    setLoading(true); setError(null); setConnStatus('Connecting...');
    try {
      const res  = await fetchWithRetry(`${BACKEND_URL}/integration/jira/stories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), email: email.trim(), apiToken: apiToken.trim(), projectKey: projectKey.trim().toUpperCase() }),
      }, 6, 10000, (retriesLeft) => {
        setConnStatus(`Waking server... (${retriesLeft} retries)`);
        if (setServerBusy) setServerBusy(true);
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Connection failed'); setConnStatus(null); return; }
      setStories(data.stories); setConnStatus(`${data.stories.length} stories loaded`);
    } catch (e) { setError('Connection error'); setConnStatus(null); }
    finally { setLoading(false); if (setServerBusy) setServerBusy(false); }
  };

  const handleAzureConnect = async () => {
    const { organization, project, personalAccessToken } = azureConfig;
    if (!organization || !project || !personalAccessToken) { setError('All fields required'); return; }
    setLoading(true); setError(null); setConnStatus('Connecting...');
    try {
      const res  = await fetchWithRetry(`${BACKEND_URL}/integration/azure/work-items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization: organization.trim(), project: project.trim(), personalAccessToken: personalAccessToken.trim() }),
      }, 6, 10000, (retriesLeft) => {
        setConnStatus(`Waking server... (${retriesLeft} retries)`);
        if (setServerBusy) setServerBusy(true);
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Connection failed'); setConnStatus(null); return; }
      setStories(data.workItems); setConnStatus(`${data.workItems.length} work items loaded`);
    } catch (e) { setError('Connection error'); setConnStatus(null); }
    finally { setLoading(false); if (setServerBusy) setServerBusy(false); }
  };

  const SourceBtn = ({ id, icon, label, sub, activeColor }) => {
    const active = mode === id;
    return (
      <button
        onClick={() => { setMode(id); setError(null); setStories([]); setSearchQuery(''); setConnStatus(null); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.8rem', transition: 'all .15s',
          background: active ? activeColor : '#f9fafb',
          color: active ? '#fff' : '#475569',
          boxShadow: active ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
        }}
      >
        <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center' }}>{icon}</div>
        <span>{label}</span>
      </button>
    );
  };

  const Field = ({ placeholder, type = 'text', value, onChange }) => (
    <input
      type={type} placeholder={placeholder} value={value} onChange={onChange} disabled={loading}
      style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: '0.81rem', border: '1.5px solid #e5e7eb', outline: 'none', background: '#fafafa', color: '#1a1a2e' }}
    />
  );

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Data Source
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <SourceBtn id="manual" icon={<PencilIcon />} label="Manual" activeColor="#4f46e5" />
          <SourceBtn id="jira" icon={<JiraIcon />} label="Jira" activeColor="#2563eb" />
          <SourceBtn id="azure" icon={<AzureIcon />} label="Azure" activeColor="#0284c7" />
        </div>
      </div>

      {!dismissed && mode !== 'manual' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 10, fontSize: '0.77rem', color: '#92400e' }}>
          <InfoIcon />
          <span style={{ flex: 1 }}>Configure credentials then click Connect.</span>
          <button onClick={() => setDismissed(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 900 }}>X</button>
        </div>
      )}

      {mode === 'manual' && (
        <div style={{ padding: '16px', background: onSelectTestCase ? '#f0f9ff' : '#f5f3ff', borderRadius: 12, border: '1px solid', borderColor: onSelectTestCase ? '#bae6fd' : '#ddd6fe', animation: 'fadeIn 0.3s ease' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: onSelectTestCase ? '#0284c7' : '#6366f1', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {onSelectTestCase ? 'Testing Tips' : 'Writing Tips'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(onSelectTestCase ? [
              { t: 'Clarity', d: 'Steps should be unambiguous and repeatable.' },
              { t: 'Traceability', d: 'Link back to a specific requirement.' },
              { t: 'Precision', d: 'Define clear, measurable expected results.' },
              { t: 'Coverage', d: 'Include both positive and negative paths.' }
            ] : [
              { t: 'Independent', d: 'Avoid dependencies on other stories.' },
              { t: 'Negotiable', d: 'Focus on the "What", leave room for the "How".' },
              { t: 'Valuable', d: 'Clearly state the benefit to the end user.' },
              { t: 'Small', d: 'Keep it granular enough for one sprint.' }
            ]).map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: onSelectTestCase ? '#3b82f6' : '#6366f1', color: '#fff', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>✓</div>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: onSelectTestCase ? '#0369a1' : '#4338ca' }}>{tip.t}</span>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: onSelectTestCase ? '#0284c7' : '#6366f1', opacity: 0.8 }}>{tip.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '16px 0 0 0', fontSize: '0.7rem', color: onSelectTestCase ? '#0ea5e9' : '#8b5cf6', fontStyle: 'italic', borderTop: '1px solid', borderColor: onSelectTestCase ? '#bae6fd' : '#ddd6fe', paddingTop: 10 }}>
            {onSelectTestCase ? 'Tip: Check the ROI Showcase for coverage metrics!' : 'Tip: Use the "Analyze" button in the Generator to pre-fill this field!'}
          </p>
        </div>
      )}

      {mode === 'jira' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ gridColumn: '1 / -1' }}><Field placeholder="Domain (e.g. company.atlassian.net)" value={jiraConfig.domain} onChange={e => setJiraConfig({...jiraConfig, domain: e.target.value})} /></div>
          <Field placeholder="Email" value={jiraConfig.email} onChange={e => setJiraConfig({...jiraConfig, email: e.target.value})} />
          <Field placeholder="Project Key" value={jiraConfig.projectKey} onChange={e => setJiraConfig({...jiraConfig, projectKey: e.target.value})} />
          <div style={{ gridColumn: '1 / -1' }}><Field placeholder="API Token" type="password" value={jiraConfig.apiToken} onChange={e => setJiraConfig({...jiraConfig, apiToken: e.target.value})} /></div>
          <div style={{ gridColumn: '1 / -1' }}><button onClick={handleJiraConnect} disabled={loading} style={{ width: '100%', padding: 8, background: '#2563eb', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}>Connect & Fetch</button></div>
        </div>
      )}

      {mode === 'azure' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Field placeholder="Organization" value={azureConfig.organization} onChange={e => setAzureConfig({...azureConfig, organization: e.target.value})} />
          <Field placeholder="Project" value={azureConfig.project} onChange={e => setAzureConfig({...azureConfig, project: e.target.value})} />
          <div style={{ gridColumn: '1 / -1' }}><Field placeholder="Token" type="password" value={azureConfig.personalAccessToken} onChange={e => setAzureConfig({...azureConfig, personalAccessToken: e.target.value})} /></div>
          <div style={{ gridColumn: '1 / -1' }}><button onClick={handleAzureConnect} disabled={loading} style={{ width: '100%', padding: 8, background: '#0284c7', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}>Connect & Fetch</button></div>
        </div>
      )}

      {connStatus && <div style={{ fontSize: '0.78rem', color: '#065f46', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><CheckIcon /> {connStatus}</div>}
      {error && <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: 6 }}>Error: {error}</div>}

      {stories.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#fff', border: '1.5px solid #e5e7f0', borderRadius: 8, padding: '0 10px' }}>
            <SearchIcon />
            <input placeholder="Filter..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, border: 'none', padding: '7px 0', outline: 'none', fontSize: '0.8rem' }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stories.filter(s => (s.summary || s.title || '').toLowerCase().includes(searchQuery.toLowerCase())).map((item, idx) => (
              <div key={idx} onClick={() => onSelectStory(mode === 'jira' ? item.description : item.description)} style={{ padding: '8px 12px', background: '#fff', border: '1.5px solid #e5e7f0', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem' }}>
                <strong>{mode === 'jira' ? item.key : item.id}</strong>: {mode === 'jira' ? item.summary : item.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationPanel;
