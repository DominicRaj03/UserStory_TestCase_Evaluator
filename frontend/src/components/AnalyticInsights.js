import React, { useState, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Bar, Line, Area, Legend, BarChart, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

/* Dynamic Mock Database of Projects/Teams */
/* Dynamic Mock Database of Projects/Teams */
const projectDatabase = {
  "Global": {
    draftTime: [
      { phase: 'User Story', manual: 25, ai: 2, savings: 92 },
      { phase: 'Test Case', manual: 20, ai: 1.5, savings: 92.5 },
      { phase: 'Review/Edit', manual: 12, ai: 3, savings: 75 },
      { phase: 'Rework Cycle', manual: 18, ai: 2, savings: 88.8 },
    ],
    quality: [
      { name: 'Factual Accuracy', manual: 72, ai: 94 },
      { name: 'Answer Relevancy', manual: 65, ai: 91 },
      { name: 'RAG Precision', manual: 54, ai: 91 },
      { name: 'Recall', manual: 58, ai: 87 },
      { name: 'Hallucination', manual: 68, ai: 96 },
    ],
    kpis: { 
      humanTimeHrs: 1600, 
      aiTimeHrs: 150, 
      timeSavedHrs: 1450, 
      costSaved: 85000, 
      totalAiCost: 450,
      efficiencyUplift: 310, 
      outputMultiplier: 12.5 
    },
    advancedMetrics: { agenticAcceptance: 88, agenticRefinements: 1.4, multiAgentConsensus: 94, deepEvalCatchRate: 42, ragContextUtil: 91, hallucinationDrop: 78 },
    monthlyTrends: [
      { 
        month: 'Mar', cost: 35000, time: 540, efficiency: 260, hits: 1200, 
        dayWise: [12, 15, 18, 10, 22, 35, 40, 28, 30, 45, 50, 42, 38, 40, 45, 55, 60, 48, 50, 52, 58, 62, 55, 50, 48, 45, 42, 40, 38, 35, 30],
        draftTime: [
          { phase: 'User Story', manual: 35, ai: 10, savings: 71 },
          { phase: 'Test Case', manual: 30, ai: 8, savings: 73 },
        ],
        quality: [
          { name: 'Factual Accuracy', manual: 60, ai: 75 },
          { name: 'Hallucination', manual: 50, ai: 65 },
        ]
      },
      { 
        month: 'Apr', cost: 62000, time: 980, efficiency: 380, hits: 2450, 
        dayWise: [45, 55, 62, 70, 75, 82, 88, 92, 95, 90, 85, 80, 78, 82, 85, 90, 95, 100, 110, 120, 115, 110, 105, 100, 95, 90, 85, 82, 80, 78],
        draftTime: [
          { phase: 'User Story', manual: 35, ai: 5, savings: 85 },
          { phase: 'Test Case', manual: 30, ai: 4, savings: 86 },
        ],
        quality: [
          { name: 'Factual Accuracy', manual: 60, ai: 85 },
          { name: 'Hallucination', manual: 50, ai: 82 },
        ]
      },
      { 
        month: 'May', cost: 85000, time: 1450, efficiency: 510, hits: 4100, 
        dayWise: [110, 125, 140, 155, 170, 185, 200, 215, 220, 210, 205, 195, 190, 185, 180, 175, 185, 195, 210, 225, 240, 255, 260, 250, 240, 230, 220, 210, 200, 190, 180],
        draftTime: [
          { phase: 'User Story', manual: 35, ai: 2.1, savings: 94 },
          { phase: 'Test Case', manual: 30, ai: 1.5, savings: 95 },
        ],
        quality: [
          { name: 'Factual Accuracy', manual: 60, ai: 98 },
          { name: 'Hallucination', manual: 50, ai: 99 },
        ]
      },
    ],
    categorySavings: [
      { name: 'User Stories', value: 45, color: '#4f46e5' },
      { name: 'Test Cases', value: 35, color: '#10b981' },
      { name: 'Artifact Review', value: 20, color: '#f59e0b' },
    ],
    searchHistory: [
      { id: 'S-1042', user: 'Dominic', task: 'Drafting: Core Banking US', type: 'User Story', manualTime: 35, aiTime: 2.1, cost: 0.12, efficiency: 94 },
      { id: 'S-1041', user: 'Sarah', task: 'Review: KYC Test Suite', type: 'Test Case', manualTime: 42, aiTime: 3.5, cost: 0.08, efficiency: 91.6 },
      { id: 'S-1040', user: 'Arun', task: 'Refinement: Auth Flow', type: 'User Story', manualTime: 28, aiTime: 1.8, cost: 0.05, efficiency: 93.5 },
      { id: 'S-1039', user: 'Elena', task: 'Generation: Edge Cases', type: 'Test Case', manualTime: 50, aiTime: 4.2, cost: 0.15, efficiency: 91.6 },
      { id: 'S-1038', user: 'Dominic', task: 'Drafting: Mortgage API', type: 'User Story', manualTime: 45, aiTime: 2.5, cost: 0.10, efficiency: 94.4 },
    ],
    qualityHistory: [
      { id: 'Q-901', user: 'System', task: 'DeepEval: Factual Accuracy', type: 'Audit', metric: '98%', status: 'Pass', impact: 'High' },
      { id: 'Q-902', user: 'System', task: 'DeepEval: Hallucination Check', type: 'Audit', metric: '99%', status: 'Pass', impact: 'Critical' },
      { id: 'Q-903', user: 'System', task: 'DeepEval: RAG Precision', type: 'Audit', metric: '94%', status: 'Pass', impact: 'High' },
    ],
    reworkHistory: [
      { id: 'R-401', user: 'Dominic', task: 'US Refinement', type: 'Correction', cycles: 1, saved: '15m', result: 'Grade A' },
      { id: 'R-402', user: 'Sarah', task: 'TC Optimization', type: 'Correction', cycles: 2, saved: '22m', result: 'Grade A' },
      { id: 'R-403', user: 'Arun', task: 'Auth Logic Fix', type: 'Correction', cycles: 1, saved: '10m', result: 'Grade B+' },
    ],
    costHistory: [
      { id: 'C-101', user: 'App', task: 'GPT-4o Prompting', type: 'Token', usage: '4.2k', cost: '$0.08', provider: 'OpenAI' },
      { id: 'C-102', user: 'App', task: 'DeepEval Embedding', type: 'Vector', usage: '1.5k', cost: '$0.02', provider: 'Pinecone' },
      { id: 'C-103', user: 'App', task: 'Agent Deliberation', type: 'Token', usage: '8.4k', cost: '$0.15', provider: 'Groq' },
    ]
  },
  "Project Alpha (FinTech)": {
    draftTime: [
      { phase: 'User Story', manual: 30, ai: 2.5, savings: 91.6 },
      { phase: 'Test Case', manual: 25, ai: 2, savings: 92 },
      { phase: 'Review/Edit', manual: 15, ai: 4, savings: 73.3 },
      { phase: 'Rework Cycle', manual: 20, ai: 2.5, savings: 87.5 },
    ],
    quality: [
      { name: 'Factual Accuracy', manual: 80, ai: 96 },
      { name: 'Answer Relevancy', manual: 70, ai: 93 },
      { name: 'RAG Precision', manual: 60, ai: 94 },
      { name: 'Recall', manual: 65, ai: 89 },
      { name: 'Hallucination', manual: 75, ai: 98 },
    ],
    kpis: { 
      humanTimeHrs: 460, 
      aiTimeHrs: 40, 
      timeSavedHrs: 420, 
      costSaved: 32000, 
      totalAiCost: 120,
      efficiencyUplift: 280, 
      outputMultiplier: 10.2 
    },
    advancedMetrics: { agenticAcceptance: 92, agenticRefinements: 1.2, multiAgentConsensus: 96, deepEvalCatchRate: 48, ragContextUtil: 95, hallucinationDrop: 82 },
    monthlyTrends: [
      { month: 'Mar', cost: 16000, time: 230, efficiency: 220 },
      { month: 'Apr', cost: 24000, time: 310, efficiency: 250 },
      { month: 'May', cost: 32000, time: 420, efficiency: 280 },
    ],
    searchHistory: [
      { id: 'A-501', user: 'Mike', task: 'FinTech Compliance US', type: 'User Story', manualTime: 40, aiTime: 3.2, cost: 0.14, efficiency: 92 },
      { id: 'A-502', user: 'Jessica', task: 'Stock API Test Plan', type: 'Test Case', manualTime: 35, aiTime: 2.8, cost: 0.09, efficiency: 92 },
    ]
  },
  "Project Beta (Healthcare)": {
    draftTime: [
      { phase: 'User Story', manual: 40, ai: 3, savings: 92.5 },
      { phase: 'Test Case', manual: 35, ai: 2.5, savings: 92.8 },
      { phase: 'Review/Edit', manual: 20, ai: 5, savings: 75 },
      { phase: 'Rework Cycle', manual: 25, ai: 3, savings: 88 },
    ],
    quality: [
      { name: 'Factual Accuracy', manual: 85, ai: 98 },
      { name: 'Answer Relevancy', manual: 75, ai: 95 },
      { name: 'RAG Precision', manual: 65, ai: 96 },
      { name: 'Recall', manual: 70, ai: 92 },
      { name: 'Hallucination', manual: 80, ai: 99 },
    ],
    kpis: { 
      humanTimeHrs: 750, 
      aiTimeHrs: 70, 
      timeSavedHrs: 680, 
      costSaved: 54000, 
      totalAiCost: 210,
      efficiencyUplift: 350, 
      outputMultiplier: 14.8 
    },
    advancedMetrics: { agenticAcceptance: 84, agenticRefinements: 1.8, multiAgentConsensus: 89, deepEvalCatchRate: 38, ragContextUtil: 86, hallucinationDrop: 74 },
    monthlyTrends: [
      { month: 'Mar', cost: 26000, time: 340, efficiency: 280 },
      { month: 'Apr', cost: 41000, time: 510, efficiency: 320 },
      { month: 'May', cost: 54000, time: 680, efficiency: 350 },
    ],
    searchHistory: [
      { id: 'B-201', user: 'David', task: 'Patient Portal US', type: 'User Story', manualTime: 55, aiTime: 4.5, cost: 0.18, efficiency: 91.8 },
      { id: 'B-202', user: 'Sofia', task: 'HIPAA Validation Tests', type: 'Test Case', manualTime: 48, aiTime: 3.9, cost: 0.12, efficiency: 91.8 },
    ]
  }
};


const MetricCard = ({ title, value, subtext, color, icon, trend, onClick, description }) => (
  <div 
    onClick={onClick}
    style={{
      background: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', flex: 1,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minWidth: 0, cursor: onClick ? 'pointer' : 'default', position: 'relative'
    }} 
    onMouseEnter={(e) => { 
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-4px)'; 
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.06)'; 
      }
    }}
    onMouseLeave={(e) => { 
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(0)'; 
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)'; 
      }
    }}
  >
    {/* Info Icon with Tooltip */}
    <div 
      className="metric-info-trigger"
      style={{ position: 'absolute', top: 20, right: 20, cursor: 'help', color: '#94a3b8' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      <div className="metric-tooltip">{description}</div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '14px', background: `${color}12`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      {trend && <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', marginRight: 24 }}>{trend}</span>}
    </div>
    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{value}</div>
    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginTop: 4 }}>{subtext}</div>
    {onClick && (
      <div style={{ marginTop: 12, fontSize: '0.7rem', color: '#4f46e5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        VIEW SPLITUP 
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </div>
    )}
  </div>
);

const DetailModal = ({ isOpen, onClose, data, title }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: 20
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '28px', width: '100%', maxWidth: '1000px',
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
      }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{title} Breakdown</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Detailed search and generation telemetry</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: 40, height: 40, borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          {/* Benchmarking Legend (Only show for Human/Efficiency/Time metrics) */}
          {(title.includes('Human') || title.includes('Efficiency') || title.includes('Gains')) && (
            <div style={{ 
              marginBottom: 24, padding: '16px 20px', background: '#f0f9ff', borderRadius: '16px', 
              border: '1px solid #bae6fd', display: 'flex', gap: 24, alignItems: 'center' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0ea5e9' }}></div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }}>MANUAL CALCULATION:</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0c4a6e', fontWeight: 600 }}>
                Junior (1-3y): <span style={{ fontWeight: 800 }}>60m</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0c4a6e', fontWeight: 600 }}>
                Senior (5y+): <span style={{ fontWeight: 800 }}>20m</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 800, background: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #7dd3fc' }}>
                Used Mean Avg: 40m
              </div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', flex: 1, textAlign: 'right' }}>
                *Baseline derived from team sprint velocity & industry benchmarks.
              </p>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                {data.length > 0 && Object.keys(data[0]).map(h => {
                  let label = h.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
                  if (label.includes('TIME')) label += ' (MIN)';
                  if (label.includes('COST')) label += ' ($)';
                  if (label.includes('SAVINGS') || label.includes('EFFICIENCY') || label.includes('METRIC')) label += ' (%)';
                  return (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} style={{ background: '#f8fafc', borderRadius: '12px' }}>
                  {Object.entries(item).map(([key, val], i) => {
                    let displayVal = val;
                    if (key.toLowerCase().includes('cost') && typeof val === 'number') displayVal = `$${val.toFixed(2)}`;
                    if (key.toLowerCase().includes('efficiency') && typeof val === 'number') displayVal = `${val}%`;
                    if (key.toLowerCase().includes('savings') && typeof val === 'number') displayVal = `${val}%`;
                    
                    return (
                      <td key={key} style={{ 
                        padding: '16px', fontSize: '0.85rem', fontWeight: 700, color: i === 0 ? '#4f46e5' : '#1e293b',
                        borderRadius: i === 0 ? '12px 0 0 12px' : i === Object.keys(item).length - 1 ? '0 12px 12px 0' : '0'
                      }}>
                        {key === 'status' || key === 'result' ? (
                          <span style={{ 
                            fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px',
                            background: val.includes('Pass') || val.includes('Grade A') ? '#dcfce7' : '#fee2e2',
                            color: val.includes('Pass') || val.includes('Grade A') ? '#15803d' : '#991b1b'
                          }}>{val}</span>
                        ) : key === 'type' ? (
                          <span style={{ 
                            fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px',
                            background: '#f1f5f9', color: '#475569'
                          }}>{val}</span>
                        ) : displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '20px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ 
            padding: '10px 24px', borderRadius: '12px', background: '#0f172a', color: '#fff', 
            fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer' 
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon, title, sub }) => (
  <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
    <span style={{ background: '#f8fafc', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>{icon}</span> 
    <div>
      <h4 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#1e293b' }}>{title}</h4>
      {sub && <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{sub}</p>}
    </div>
  </div>
);

const AnalyticInsights = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProject, setActiveProject] = useState('Global');
  const [activeMonth, setActiveMonth] = useState('Consolidated');
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [dayModalData, setDayModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [liveData, setLiveData] = useState([]);

  // Subscribe to live Firestore telemetry for global team ROI
  useEffect(() => {
    try {
      const q = query(collection(db, 'team_evaluations'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const events = [];
        snapshot.forEach((doc) => events.push({ id: doc.id, ...doc.data() }));
        setLiveData(events);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore not configured yet or offline", e);
    }
  }, []);

  // Filter projects based on search
  const availableProjects = Object.keys(projectDatabase).filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
  const currentData = projectDatabase[activeProject] || projectDatabase['Global'];

  // Calculate Display KPIs based on month dropdown and live data
  const getDisplayKpis = () => {
    // If we are on Global and have live data, calculate REAL KPIs!
    if (activeProject === 'Global' && activeMonth === 'Consolidated' && liveData.length > 0) {
      const totalEvents = liveData.length;
      const timeSavedHrs = liveData.reduce((sum, el) => sum + (el.timeSaved || 0), 0) / 60;
      const manualTimeHrs = liveData.reduce((sum, el) => sum + (el.timeSaved === 45 ? 50 : 35), 0) / 60;
      const aiTimeHrs = manualTimeHrs - timeSavedHrs;
      const costSaved = timeSavedHrs * 65; // Estimated $65/hr fully loaded cost
      
      return {
        humanTimeHrs: Math.round(manualTimeHrs),
        aiTimeHrs: Math.round(aiTimeHrs) || 1,
        timeSavedHrs: Math.round(timeSavedHrs),
        costSaved: Math.round(costSaved),
        totalAiCost: Math.round(totalEvents * 0.12),
        efficiencyUplift: Math.round((timeSavedHrs / (aiTimeHrs || 1)) * 100),
        outputMultiplier: parseFloat((manualTimeHrs / (aiTimeHrs || 1)).toFixed(1))
      };
    }

    if (activeMonth === 'Consolidated') {
      return currentData.kpis;
    }
    
    // Find index of selected month
    const idx = currentData.monthlyTrends.findIndex(m => m.month === activeMonth);
    if (idx === -1) return currentData.kpis;

    const currentMonthData = currentData.monthlyTrends[idx];
    const prevMonthData = idx > 0 ? currentData.monthlyTrends[idx - 1] : { cost: 0, time: 0, efficiency: 0 };

    // Calculate month-isolated data (since trends are cumulative)
    const timeSaved = currentMonthData.time - prevMonthData.time;
    const costSaved = currentMonthData.cost - prevMonthData.cost;
    
    return {
      ...currentData.kpis,
      costSaved: costSaved,
      timeSavedHrs: timeSaved,
      humanTimeHrs: Math.round(timeSaved * 1.1), 
      aiTimeHrs: Math.round(timeSaved * 0.1),
      totalAiCost: Math.round(costSaved * 0.005),
      efficiencyUplift: currentMonthData.efficiency - (idx > 0 ? currentData.monthlyTrends[idx-1].efficiency : 0),
      outputMultiplier: parseFloat((currentData.kpis.outputMultiplier * (currentMonthData.cost / currentData.monthlyTrends[currentData.monthlyTrends.length-1].cost)).toFixed(1))
    };
  };

  const displayKpis = getDisplayKpis();
  
  // Replace search history with Live Data if applicable
  const displayHistory = (activeProject === 'Global' && liveData.length > 0) 
    ? liveData.map(d => ({ id: d.id.substring(0, 8), user: 'Team Member', task: d.artifactPreview, type: d.type, manualTime: d.timeSaved === 45 ? 50 : 35, aiTime: d.timeSaved === 45 ? 5 : 5, cost: 0.12, efficiency: d.grade === 'A' ? 98 : d.grade === 'B' ? 92 : 85 }))
    : currentData.searchHistory;

  // Filtered Data for Charts
  const filteredTrends = useMemo(() => {
    if (activeMonth === 'Consolidated') return currentData.monthlyTrends;
    return currentData.monthlyTrends.filter(m => m.month === activeMonth);
  }, [activeMonth, currentData]);

  const filteredDraftTime = useMemo(() => {
    if (activeMonth === 'Consolidated') return currentData.draftTime;
    const monthData = currentData.monthlyTrends.find(m => m.month === activeMonth);
    return monthData?.draftTime || currentData.draftTime;
  }, [activeMonth, currentData]);

  const filteredQuality = useMemo(() => {
    if (activeMonth === 'Consolidated') return currentData.quality;
    const monthData = currentData.monthlyTrends.find(m => m.month === activeMonth);
    return monthData?.quality || currentData.quality;
  }, [activeMonth, currentData]);

  return (
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', color: '#1e293b', animation: 'fadeIn 0.5s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .custom-tooltip { background: rgba(255, 255, 255, 0.98); border: 1px solid #e2e8f0; padding: 12px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); font-size: 0.85rem; font-weight: 600; }
        .search-input:focus { outline: none; border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .metric-info-trigger:hover .metric-tooltip { opacity: 1; visibility: visible; transform: translateY(0); }
        .metric-tooltip { 
          position: absolute; top: 30px; right: 0; width: 220px; background: #0f172a; color: #fff; 
          padding: 12px; borderRadius: 12px; font-size: 0.7rem; font-weight: 500; line-height: 1.4;
          z-index: 100; opacity: 0; visibility: hidden; transform: translateY(5px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* Header & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
        <div>
           <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
             ROI <span style={{ color: '#4f46e5' }}>Analytics Engine</span>
           </h2>
           <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500, marginTop: 8 }}>
             Validate time, cost, and efficiency improvements across different domains.
           </p>
        </div>
        
        {/* Project Search/Selector */}
        <div style={{ background: '#fff', padding: '6px 12px', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, minWidth: 300, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            placeholder="Search project domain (e.g. FinTech)..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', padding: '8px 0' }}
          />
        </div>
      </div>

      {/* Project Selector Pills */}
      {searchQuery && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
          {availableProjects.length > 0 ? availableProjects.map(p => (
            <button 
              key={p} 
              onClick={() => { setActiveProject(p); setSearchQuery(''); }}
              style={{ 
                padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
                background: activeProject === p ? '#4f46e5' : '#fff',
                color: activeProject === p ? '#fff' : '#64748b',
                border: `1px solid ${activeProject === p ? '#4f46e5' : '#e2e8f0'}`
              }}
            >
              {p}
            </button>
          )) : <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>No projects found matching "{searchQuery}"</span>}
        </div>
      )}

      {/* Active Filter Indicator & Month Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Active View:</span>
          <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, border: '1px solid #a7f3d0' }}>
            {activeProject}
          </span>
        </div>

        {/* Month Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Timeframe:</span>
          <select 
            value={activeMonth} 
            onChange={(e) => setActiveMonth(e.target.value)}
            style={{ 
              padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', 
              fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', outline: 'none' 
            }}
          >
            <option value="Consolidated">Consolidated (All-Time)</option>
            {currentData.monthlyTrends.map(m => (
              <option key={m.month} value={m.month}>{m.month} (Isolated)</option>
            ))}
          </select>
        </div>
      </div>

      {/* REORDERED: Monthly Trends Chart moved to Top */}
      <div style={{ background: '#ffffff', borderRadius: '32px', padding: '40px', border: '1px solid #e2e8f0', marginBottom: 20, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Monthly Growth Trajectory</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Cumulative increase in cost savings, time, and overall efficiency.</p>
          </div>
        </div>

        <div style={{ height: 400, width: '100%', marginTop: 32 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredTrends}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => val >= 1000 ? `$${val/1000}k` : val} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
              <Tooltip content={<div className="custom-tooltip" />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle" 
                wrapperStyle={{ paddingBottom: 20, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }} 
                onMouseEnter={(e) => setHoveredMetric(e.dataKey)}
                onMouseLeave={() => setHoveredMetric(null)}
              />
              <Area 
                yAxisId="left" 
                type="monotone" 
                dataKey="cost" 
                stroke="#10b981" 
                strokeWidth={4} 
                fillOpacity={hoveredMetric && hoveredMetric !== 'cost' ? 0.02 : 1} 
                strokeOpacity={hoveredMetric && hoveredMetric !== 'cost' ? 0.1 : 1}
                fill="url(#colorCost)" 
                name="Cost Savings ($)"
                style={{ transition: 'all 0.3s ease' }}
              >
                <LabelList dataKey="cost" position="top" formatter={(v) => `$${v/1000}k`} style={{ fontSize: '10px', fontWeight: 800, fill: '#10b981', opacity: hoveredMetric && hoveredMetric !== 'cost' ? 0 : 1 }} />
              </Area>
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="time" 
                stroke="#4f46e5" 
                strokeWidth={4} 
                strokeOpacity={hoveredMetric && hoveredMetric !== 'time' ? 0.1 : 1}
                dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff', opacity: hoveredMetric && hoveredMetric !== 'time' ? 0.1 : 1 }} 
                name="Time Saved (hrs)"
                style={{ transition: 'all 0.3s ease' }}
              >
                <LabelList dataKey="time" position="top" style={{ fontSize: '10px', fontWeight: 800, fill: '#4f46e5', opacity: hoveredMetric && hoveredMetric !== 'time' ? 0 : 1 }} />
              </Line>
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="efficiency" 
                stroke="#f59e0b" 
                strokeWidth={4} 
                strokeOpacity={hoveredMetric && hoveredMetric !== 'efficiency' ? 0.1 : 1}
                dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff', opacity: hoveredMetric && hoveredMetric !== 'efficiency' ? 0.1 : 1 }} 
                name="Efficiency Uplift (%)"
                style={{ transition: 'all 0.3s ease' }}
              >
                <LabelList dataKey="efficiency" position="bottom" formatter={(v) => `${v}%`} style={{ fontSize: '10px', fontWeight: 800, fill: '#f59e0b', opacity: hoveredMetric && hoveredMetric !== 'efficiency' ? 0 : 1 }} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ position: 'absolute', bottom: 40, right: 40, fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
          *Efficiency (%) and Time (hrs) are plotted on the right axis for scale clarity.
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
        <MetricCard 
          title="Human Effort (Mean)" 
          value={`${displayKpis.humanTimeHrs}h`} 
          subtext="Avg. 40m/artifact baseline" 
          color="#64748b" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} 
          trend="BENCHMARKED"
          description="Total hours required if work was done manually. Based on a 40-minute mean average across all experience levels."
          onClick={() => { setModalTitle('Human Effort'); setModalData(displayHistory); setIsModalOpen(true); }}
        />
        <MetricCard 
          title="AI Velocity" 
          value={`${displayKpis.aiTimeHrs}h`} 
          subtext="Autonomous processing time" 
          color="#8b5cf6" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2V4"/><path d="M12 20V22"/><path d="M4.93 4.93L6.34 6.34"/><path d="M17.66 17.66L19.07 19.07"/><path d="M2 12H4"/><path d="M20 12H22"/><path d="M4.93 19.07L6.34 17.66"/><path d="M17.66 6.34L19.07 4.93"/><circle cx="12" cy="12" r="4"/></svg>} 
          trend="ACCELERATED"
          description="The actual clock time spent by AI agents generating and evaluating artifacts in minutes."
          onClick={() => { setModalTitle('AI Velocity'); setModalData(displayHistory); setIsModalOpen(true); }}
        />
        <MetricCard 
          title="Time Reclaimed" 
          value={`${displayKpis.timeSavedHrs}h`} 
          subtext={activeMonth === 'Consolidated' ? "Total hours saved" : `Saved in ${activeMonth}`} 
          color="#4f46e5" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} 
          trend="UP" 
          description="Net hours saved (Human Time - AI Time). Represents the total capacity returned to the engineering team."
          onClick={() => { setModalTitle('Efficiency Gains'); setModalData(displayHistory); setIsModalOpen(true); }}
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
        <MetricCard 
          title="Cost Savings" 
          value={`$${displayKpis.costSaved.toLocaleString()}`} 
          subtext="Net budget reduction" 
          color="#10b981" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} 
          trend="OPTIMIZED" 
          description="Financial savings calculated by (Human Time Saved * Avg Hourly Rate) minus AI infrastructure costs."
          onClick={() => { setModalTitle('Financial Impact'); setModalData(currentData.costHistory); setIsModalOpen(true); }}
        />
        <MetricCard 
          title="Quality Uplift" 
          value="+42%" 
          subtext="DeepEval defect catch rate" 
          color="#ec4899" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} 
          trend="SECURED"
          description="The percentage increase in defects/hallucinations caught by DeepEval compared to standard peer reviews."
          onClick={() => { setModalTitle('Quality Metrics'); setModalData(currentData.qualityHistory); setIsModalOpen(true); }}
        />
        <MetricCard 
          title="Rework Avoided" 
          value="84%" 
          subtext="Self-correction success rate" 
          color="#f59e0b" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>} 
          trend="REFINED" 
          description="Percentage of artifacts that were successfully auto-corrected by agents before reaching human review."
          onClick={() => { setModalTitle('Rework Analysis'); setModalData(currentData.reworkHistory); setIsModalOpen(true); }}
        />
      </div>

      {/* KPI Cards Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
        <MetricCard 
          title="ROI Multiplier" 
          value="18x" 
          subtext="Value generated per $1 AI cost" 
          color="#06b6d4" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="m17 5-5 5-5-5"/><path d="m17 19-5-5-5 5"/></svg>} 
          trend="MULTIPLE" 
          description="For every $1 spent on LLM tokens and infrastructure, this is the dollar value of time reclaimed by the team."
          onClick={() => { setModalTitle('ROI Analysis'); setModalData(currentData.costHistory); setIsModalOpen(true); }}
        />
        <MetricCard 
          title="AI Cost" 
          value={`$${(displayKpis.totalAiCost || 0).toLocaleString()}`} 
          subtext="Total API spend" 
          color="#f43f5e" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-5"/><path d="M12 22V12"/><path d="m21 7-9 5-9-5"/></svg>} 
          trend="MINIMAL" 
          description="Total expenditure on LLM API tokens (OpenAI, Groq) and Vector Database operations."
          onClick={() => { setModalTitle('AI Expenses'); setModalData(currentData.costHistory); setIsModalOpen(true); }}
        />
        <MetricCard 
          title="Efficiency Uplift" 
          value={`+${displayKpis.efficiencyUplift}%`} 
          subtext="Total delivery acceleration" 
          color="#0ea5e9" 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>} 
          trend="ACCELERATED" 
          description="Total percentage increase in artifact production speed across the entire software development lifecycle."
          onClick={() => { setModalTitle('Productivity'); setModalData(currentData.searchHistory); setIsModalOpen(true); }}
        />
      </div>


      {/* Detail Modal */}
      <DetailModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalTitle}
        data={modalData}
      />


      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 40 }}>
        {/* Time Savings Chart */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0' }}>
          <SectionHeader 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5"><path d="M12 20v-8"/><path d="M16 20v-4"/><path d="M8 20v-12"/></svg>} 
            title="Drafting Time Analysis" 
            sub="Manual vs. AI (Minutes per artifact)" 
          />
          <div style={{ height: 300, width: '100%', marginTop: 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredDraftTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="phase" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip content={<div className="custom-tooltip" />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="manual" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={40} name="Manual (min)" />
                <Line type="monotone" dataKey="ai" stroke="#4f46e5" strokeWidth={4} dot={{ stroke: '#4f46e5', fill: '#fff', strokeWidth: 3, r: 5 }} name="AI (min)">
                  <LabelList dataKey="ai" position="top" style={{ fontSize: '10px', fontWeight: 800, fill: '#4f46e5' }} offset={10} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Improvement Radar */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0' }}>
          <SectionHeader 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>} 
            title="Quality Assurance Radar" 
            sub="DeepEval scoring metrics comparison" 
          />
          <div style={{ height: 300, width: '100%', marginTop: 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={filteredQuality}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="name" tick={{fontSize: 10, fontWeight: 800, fill: '#475569'}} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{fontSize: 9}} />
                <Radar name="Manual" dataKey="manual" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                <Radar name="AI" dataKey="ai" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Tooltip content={<div className="custom-tooltip" />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', marginBottom: 40 }}>
      {/* Monthly Trends - Removed (Moved to Top) */}

      {/* New Management Reports Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Usage Hits Count Chart */}
        <div style={{ background: '#ffffff', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Platform Adoption & Hit Count</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Total searches and artifact generations per month. <span style={{ color: '#8b5cf6', fontWeight: 800 }}>(Click bars for daily split-up)</span></p>
            </div>
            <div style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5' }}>
              VOLUME: {filteredTrends.reduce((acc, curr) => acc + curr.hits, 0).toLocaleString()} Hits
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<div className="custom-tooltip" />} />
                <Bar 
                  dataKey="hits" 
                  fill="#8b5cf6" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40} 
                  name="Total Usage Hits" 
                  onClick={(data) => {
                    setDayModalData(data.dayWise || []);
                    setModalTitle(data.month);
                    setIsDayModalOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <LabelList dataKey="hits" position="top" style={{ fontSize: '11px', fontWeight: 900, fill: '#8b5cf6' }} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Distribution Pie */}
        <div style={{ background: '#ffffff', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginBottom: 24 }}>ROI Distribution</h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentData.categorySavings || [
                    { name: 'User Stories', value: 45, color: '#4f46e5' },
                    { name: 'Test Cases', value: 35, color: '#10b981' },
                    { name: 'Review', value: 20, color: '#f59e0b' },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {(currentData.categorySavings || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 16 }}>
            {(currentData.categorySavings || []).map((item) => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Advanced AI Telemetry Section */}
      <div style={{ background: '#0f172a', borderRadius: '28px', padding: '40px', color: '#fff', marginBottom: 48 }}>
        <SectionHeader 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>} 
          title={<span style={{ color: '#f8fafc' }}>Agentic AI & DeepEval Telemetry</span>}
          sub={<span style={{ color: '#94a3b8' }}>Measurable KPIs for autonomous agents and high-precision RAG evaluation.</span>} 
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 32 }}>
          <div style={{ background: '#1e293b', borderRadius: '20px', padding: '24px', border: '1px solid #334155' }}>
            <h5 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}></span>
              Agentic Refinement Engine
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid #334155' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Autonomous Acceptance Rate</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Frequency of user accepting AI revisions.</p>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#8b5cf6' }}>
                  {(activeMonth === 'Mar' || activeMonth === 'Apr') ? 'N/A' : `${currentData.advancedMetrics.agenticAcceptance}%`}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid #334155' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Multi-Agent Consensus</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Alignment between Dev, QA, and PO personas.</p>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                  {(activeMonth === 'Mar' || activeMonth === 'Apr') ? 'N/A' : `${currentData.advancedMetrics.multiAgentConsensus}%`}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Self-Correction Cycles</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Avg iterations before hitting Grade A.</p>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>
                  {(activeMonth === 'Mar' || activeMonth === 'Apr') ? 'N/A' : currentData.advancedMetrics.agenticRefinements}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#1e293b', borderRadius: '20px', padding: '24px', border: '1px solid #334155' }}>
            <h5 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899' }}></span>
              DeepEval (RAG) Architecture
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid #334155' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Defect Catch Rate</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Issues caught vs. standard LLM logic.</p>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ec4899' }}>+{currentData.advancedMetrics.deepEvalCatchRate}%</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid #334155' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>RAG Context Utilization</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Effectiveness of historical retrieval.</p>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3b82f6' }}>{currentData.advancedMetrics.ragContextUtil}%</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Hallucination Reduction</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Decrease in false assumptions.</p>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>-{currentData.advancedMetrics.hallucinationDrop}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticInsights;
