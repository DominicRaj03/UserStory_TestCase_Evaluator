import React, { useState } from 'react';
import UserStoryEvaluator from './components/UserStoryEvaluator';
import TestCaseEvaluator from './components/TestCaseEvaluator';
import UserStoryGenerator from './components/UserStoryGenerator';
import TestCaseGenerator from './components/TestCaseGenerator';
import BulkUserStoryEvaluator from './components/BulkUserStoryEvaluator';
import BulkTestCaseEvaluator from './components/BulkTestCaseEvaluator';
import AnalyticInsights from './components/AnalyticInsights';

const NAV_GROUPS = [
  {
    title: 'GENERATOR',
    items: [
      { id: 'us-gen', label: 'User Story', color: '#10b981' },
      { id: 'tc-gen', label: 'Test Case',  color: '#3b82f6' },
    ]
  },
  {
    title: 'EVALUATOR',
    items: [
      { id: 'us-eval', label: 'User Story', color: '#8b5cf6' },
      { id: 'tc-eval', label: 'Test Case',  color: '#f43f5e' },
    ]
  },
  {
    title: 'BULK UPLOAD',
    items: [
      { id: 'bulk-us', label: 'User Story', color: '#f59e0b' },
      { id: 'bulk-tc', label: 'Test Case',  color: '#06b6d4' },
    ]
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: 'roi', label: 'ROI Showcase', color: '#ec4899' },
    ]
  }
];

const RocketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.71-2.13.71-2.13l-1.58-1.58s-1.29 0-2.13.71Z"/><path d="m12 15-3-3l1.35-1.35a2.39 2.39 0 0 1 3.39 0l.26.26a2.39 2.39 0 0 1 0 3.39L12 15Z"/><path d="M17.07 7.93c1.1-1.1 1.1-2.8 0-3.9s-2.8-1.1-3.9 0L2 15l2.83 2.83L17.07 7.93Z"/><path d="M17.07 7.93c.75.75 2.56 1.05 3.53 1.05s1.4-.41 1.4-1.4c0-.97-.3-2.78-1.05-3.53s-2.56-1.05-3.53-1.05-1.4.41-1.4 1.4c0 .97.3 2.78 1.05 3.53Z"/>
  </svg>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('us-eval');
  const isSidebarOpen = true;
  const [initialStory, setInitialStory] = useState('');
  const [initialTestCase, setInitialTestCase] = useState('');
  const [serverBusy, setServerBusy] = useState(false);

  const handleAnalyzeStory = (story) => {
    setInitialStory(story);
    setActiveTab('us-eval');
  };

  const handleAnalyzeTestCase = (tc) => {
    setInitialTestCase(tc);
    setActiveTab('tc-eval');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'us-gen': return <UserStoryGenerator setServerBusy={setServerBusy} onAnalyze={handleAnalyzeStory} />;
      case 'tc-gen': return <TestCaseGenerator setServerBusy={setServerBusy} onAnalyze={handleAnalyzeTestCase} />;
      case 'us-eval': return <UserStoryEvaluator setServerBusy={setServerBusy} initialValue={initialStory || ''} />;
      case 'tc-eval': return <TestCaseEvaluator setServerBusy={setServerBusy} initialValue={initialTestCase || ''} />;
      case 'bulk-us': return <BulkUserStoryEvaluator setServerBusy={setServerBusy} onAnalyze={handleAnalyzeStory} />;
      case 'bulk-tc': return <BulkTestCaseEvaluator setServerBusy={setServerBusy} onAnalyze={handleAnalyzeTestCase} />;
      case 'roi': return <AnalyticInsights />;
      default: return <UserStoryEvaluator setServerBusy={setServerBusy} initialValue={initialStory || ''} />;
    }
  };

  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Evaluator';

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f8' }}>
      
      {/* Sidebar */}
      <aside style={{ 
        width: isSidebarOpen ? 280 : 80, 
        background: '#0f1117', 
        color: '#fff', 
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 100,
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)'
      }}>
        {/* Logo Section */}
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ 
            width: 44, height: 44, borderRadius: 14, 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.45)'
          }}>
            <RocketIcon />
          </div>
          {isSidebarOpen && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h1 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0, letterSpacing: '0.05em', color: '#fff' }}>QA AI AGENT</h1>
              <p style={{ fontSize: '0.65rem', margin: 0, opacity: 0.5, fontWeight: 700 }}>WORKBENCH V2</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '24px 14px', overflowY: 'auto' }}>
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: 28 }}>
              {isSidebarOpen && (
                <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', padding: '0 12px', marginBottom: 10 }}>
                  {group.title}
                </p>
              )}
              {group.items.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px',
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                      border: 'none', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s', marginBottom: 4, position: 'relative'
                    }}
                  >
                    <span style={{ 
                      width: 8, height: 8, borderRadius: '50%', background: item.color, 
                      boxShadow: isActive ? `0 0 10px ${item.color}` : 'none' 
                    }} />
                    {isSidebarOpen && (
                      <span style={{ 
                        fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, 
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' 
                      }}>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Status indicator */}
        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', 
            background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ 
              width: 8, height: 8, borderRadius: '50%', 
              background: serverBusy ? '#f59e0b' : '#10b981',
              animation: serverBusy ? 'pulse 1.5s infinite' : 'none'
            }} />
            {isSidebarOpen && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                {serverBusy ? 'SYSTEM BUSY' : 'SYSTEM READY'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header style={{ 
          height: 70, background: '#fff', borderBottom: '1px solid #e5e7f0', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)', zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 3, height: 20, background: '#6366f1', borderRadius: 4 }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeLabel} <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: 4 }}>EVALUATOR</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ 
              fontSize: '0.65rem', fontWeight: 900, background: '#f5f3ff', color: '#6366f1', 
              padding: '6px 12px', borderRadius: 20, border: '1px solid #e0deff' 
            }}>AI-POWERED</span>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <div className="content-fade-in" style={{ maxWidth: '1600px', margin: '0 auto' }}>
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
