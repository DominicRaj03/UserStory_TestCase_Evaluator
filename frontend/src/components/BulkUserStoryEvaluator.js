import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchWithRetry } from '../utils/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const ITEMS_PER_PAGE = 5;
const REQUIRED_COLUMNS = ['userStory'];

const scoreColor = (s) => {
  if (s >= 27) return '#10b981';
  if (s >= 22) return '#3b82f6';
  if (s >= 16) return '#f59e0b';
  return '#ef4444';
};

function BulkUserStoryEvaluator({ setServerBusy, onAnalyze }) {
  const [file, setFile]             = useState(null);
  const [items, setItems]           = useState([]);
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [validationError, setValidationError] = useState(null);
  const [runDeepEval, setRunDeepEval] = useState(false);

  const validateExcel = (data) => {
    if (!data?.length) return 'Excel file is empty';
    const cols = Object.keys(data[0]);
    const missing = REQUIRED_COLUMNS.filter(c => !cols.includes(c));
    if (missing.length) return `Missing column(s): ${missing.join(', ')}`;
    const empty = data.filter(r => !r.userStory?.toString().trim());
    if (empty.length) return `${empty.length} empty rows found. All rows need a "userStory" value.`;
    return null;
  };

  const downloadTemplate = () => {
    const template = [
      { userStory: 'As a user, I want to login so that I can access my dashboard.' },
      { userStory: 'As an admin, I want to delete users so that I can manage the system.' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [{ wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'User Stories');
    XLSX.writeFile(wb, 'user_story_template.xlsx');
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setError(null); setValidationError(null); setResults([]); setCurrentPage(1);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        if (json.length === 0) {
          setValidationError('The uploaded file is empty.');
          return;
        }

        const cols = Object.keys(json[0]);
        const missing = REQUIRED_COLUMNS.filter(c => !cols.includes(c));
        if (missing.length > 0) {
          setValidationError(`Missing required column: ${missing.join(', ')}`);
          return;
        }

        setItems(json);
        setFile(uploadedFile);
      } catch (err) {
        setError('Failed to parse file. Please use a valid Excel or CSV.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleEvaluateAll = async () => {
    if (!items.length) { setError('Please upload a file first'); return; }
    setLoading(true); setError(null);
    setResults([]);
    
    const concurrency = 2;
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (item, batchIdx) => {
        const idx = i + batchIdx;
        const us = item.userStory?.toString().trim();
        
        if (!us) return { ...item, error: 'Empty', rowNumber: idx + 2 };

        try {
          const res = await fetchWithRetry(`${BACKEND_URL}/evaluate`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userStory: us, runDeepEval }),
          }, 8, 12000, (retriesLeft) => {
            setError(`Server initializing... (${retriesLeft} attempts remaining)`);
            if (setServerBusy) setServerBusy(true);
          });

          const data = await res.json();
          return res.ok
            ? { ...item, ...data, evaluationDone: true, rowNumber: idx + 2 }
            : { ...item, error: data.error || 'Evaluation failed', rowNumber: idx + 2 };
        } catch (err) {
          return { ...item, error: 'Network error or timeout', rowNumber: idx + 2 };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      setResults(prev => [...prev, ...batchResults]);
      setError(null);
    }

    setLoading(false);
    if (setServerBusy) setServerBusy(false);
  };

  const itemsPerPage = ITEMS_PER_PAGE;
  const totalPages = Math.ceil((results || []).length / itemsPerPage);
  const paginatedResults = (results || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bulk-evaluator-container" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px 20px', borderRadius: 16, marginBottom: 24, display: 'flex', gap: 12 }}>
        <div style={{ fontSize: '1.2rem' }}>📋</div>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>Bulk User Story Evaluator</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#b45309' }}>Upload an Excel file with a "userStory" column to evaluate multiple items in parallel.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1.5px solid #e5e7f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ marginBottom: 24 }}>
             <button className="btn-secondary" onClick={() => window.open('/user_story_template.xlsx')} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Download Template
             </button>
          </div>

          <div 
            className="drop-zone"
            onClick={() => document.getElementById('file-upload-us').click()}
            style={{ 
              border: '2px dashed #cbd5e1', borderRadius: 20, padding: '40px 20px', textAlign: 'center', 
              cursor: 'pointer', transition: 'all 0.2s', background: items.length > 0 ? '#f0f9ff' : '#f8fafc'
            }}
          >
            <input id="file-upload-us" type="file" hidden accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Click to upload or drag and drop</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>Excel (.xlsx, .xls) or CSV</p>
            {items.length > 0 && <p style={{ marginTop: 12, fontSize: '0.75rem', color: '#0369a1', fontWeight: 700 }}>File: {items.length} items loaded</p>}
          </div>

          {validationError && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 12, border: '1px solid #fee2e2', display: 'flex', gap: 10 }}>
              <span style={{ color: '#ef4444' }}>⚠️</span>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>{validationError}</p>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={handleEvaluateAll} disabled={loading || !items.length || !!validationError}>
              {loading ? `Evaluating ${Math.min(results.length + 1, items.length)} / ${items.length}...` : `Run Evaluation on ${items.length} Items`}
            </button>
            {error && <div style={{ marginTop: 12, color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1.5px solid #e5e7f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', minHeight: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Results</h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{results.length}/{items.length} successful</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.2 }}>📉</div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>No results to display yet. Upload a file and start evaluation.</p>
              </div>
            )}

            {results.length > 0 && (
              <>
                {paginatedResults.map((r, i) => (
                  <div key={i} style={{ 
                    padding: '24px', 
                    borderRadius: 24, 
                    border: '1.5px solid #e5e7f0', 
                    background: '#fff', 
                    marginBottom: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>
                        {r.name || `User Story Row ${r.rowNumber}`}
                      </h4>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 900, 
                        color: scoreColor(r.totalScore), 
                        background: `${scoreColor(r.totalScore)}15`, 
                        padding: '4px 12px', 
                        borderRadius: 20,
                        border: `1px solid ${scoreColor(r.totalScore)}40`
                      }}>
                        {r.totalScore} POINTS
                      </span>
                    </div>

                    <div style={{ 
                      background: '#f8fafc', 
                      padding: '16px 20px', 
                      borderRadius: 12, 
                      border: '1px solid #e2e8f0', 
                      marginBottom: 20,
                      fontSize: '0.82rem',
                      color: '#475569',
                      lineHeight: 1.6
                    }}>
                      {r.userStory}
                    </div>

                    {r.evaluationDone && (
                      <>
                        <div style={{ 
                          background: '#fff', 
                          border: '1.5px solid #6366f120', 
                          borderRadius: 16, 
                          padding: '18px',
                          marginBottom: 16
                        }}>
                          <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>INVEST ANALYSIS</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                            {['I', 'N', 'V', 'E', 'S', 'T'].map((char, idx) => {
                              const param = r.parameters?.[idx];
                              const score = param?.score || 0;
                              return (
                                <div key={char} style={{ 
                                  textAlign: 'center', 
                                  padding: '8px', 
                                  background: '#f8fafc', 
                                  borderRadius: 10,
                                  border: `1px solid ${score === 5 ? '#10b98140' : '#e2e8f0'}`
                                }}>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', marginBottom: 2 }}>{char}</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 950, color: score === 5 ? '#10b981' : '#475569' }}>{score}</div>
                                </div>
                              );
                            })}
                          </div>
                          <p style={{ 
                            marginTop: 14, 
                            fontSize: '0.75rem', 
                            color: '#475569', 
                            margin: '14px 0 0 0',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap'
                          }}>
                            <strong style={{ color: '#1e293b', fontSize: '0.65rem', textTransform: 'uppercase', marginRight: 6, display: 'block', marginBottom: 4 }}>INVEST Score Overview:</strong>
                            {r.investOverview || r.recommendations?.[0] || "This story is well-defined and meets standard INVEST quality benchmarks."}

                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => onAnalyze && onAnalyze(r.userStory)}
                            style={{
                              background: '#f5f3ff',
                              color: '#6366f1',
                              border: '1.5px solid #6366f140',
                              padding: '8px 16px',
                              borderRadius: 10,
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              textTransform: 'uppercase'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#6366f1'; }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            ANALYZE THIS STORY
                          </button>
                        </div>
                      </>
                    )}

                    {r.error && (
                      <div style={{ marginTop: 12, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                        <p style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, margin: 0 }}>ERROR: {r.error}</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="btn-secondary" style={{ padding: '8px 16px' }}>Prev</button>
                    <span style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.85rem' }}>Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="btn-secondary" style={{ padding: '8px 16px' }}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkUserStoryEvaluator;
