import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchWithRetry } from '../utils/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const ITEMS_PER_PAGE = 5;
const REQUIRED_COLUMNS = ['testCase'];

const scoreColor = (s) => {
  if (s >= 22) return '#10b981';
  if (s >= 16) return '#3b82f6';
  if (s >= 11) return '#f59e0b';
  return '#ef4444';
};

function BulkTestCaseEvaluator({ setServerBusy, onAnalyze }) {
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
    const empty = data.filter(r => !r.testCase?.toString().trim());
    if (empty.length) return `${empty.length} empty rows found.`;
    return null;
  };

  const downloadTemplate = () => {
    const template = [
      { testCase: 'Steps: 1. Login 2. Click User\nExpected: User details shown' },
      { testCase: 'Steps: 1. Enter invalid email\nExpected: Error message' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [{ wch: 100 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
    XLSX.writeFile(wb, 'test_case_template.xlsx');
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setItems([]); setResults([]); setError(null); setValidationError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        if (json.length === 0) {
          setValidationError('File is empty.');
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
        setError('Failed to parse file. Use a valid Excel or CSV.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const handleEvaluateAll = async () => {
    if (!items.length) { setError('Please upload a file'); return; }
    setLoading(true); setError(null);
    setResults([]);

    const concurrency = 2;
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (item, batchIdx) => {
        const idx = i + batchIdx;
        const tc = item.testCase?.toString().trim();
        
        if (!tc) {
          return { ...item, error: 'Empty', rowNumber: idx + 2 };
        }

        try {
          const res = await fetchWithRetry(`${BACKEND_URL}/evaluate-test-case`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testCase: tc, runDeepEval }),
          }, 8, 12000, (retriesLeft) => {
            setError(`Server initializing... (${retriesLeft} attempts remaining)`);
            if (setServerBusy) setServerBusy(true);
          });

          const data = await res.json();
          return res.ok
            ? { ...item, ...data, evaluationDone: true, rowNumber: idx + 2 }
            : { ...item, error: data.error || 'Evaluation failed', rowNumber: idx + 2 };
        } catch (err) {
          return { ...item, error: 'Network error', rowNumber: idx + 2 };
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
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ padding: '14px 18px', background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 12, marginBottom: 18 }}>
        <p style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Bulk Test Case Evaluator
        </p>
        <p style={{ fontSize: '0.81rem', color: '#047857', margin: 0 }}>
          Analyze multiple test cases from a single Excel or CSV file.
        </p>
      </div>

      <div style={{ marginBottom: 14 }}>
        <button className="btn-dl" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
          Download Template
        </button>
      </div>

      <label htmlFor="bulkTCFile" className="drop-zone" style={{ display: 'block', cursor: 'pointer' }}>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} id="bulkTCFile" style={{ display: 'none' }} />
        <div style={{ marginBottom: 8, color: '#3b82f6' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <p style={{ fontWeight: 700, color: '#4b5563' }}>Upload Test Case File</p>
        {file && <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>File: {file.name}</p>}
      </label>

      {validationError && <div style={{ marginTop: 12, color: '#ef4444', fontSize: '0.82rem' }}>Error: {validationError}</div>}

      <div style={{ marginTop: 16 }}>
        <button className="btn-primary" onClick={handleEvaluateAll} disabled={loading || !items.length || !!validationError} style={{ background: '#3b82f6' }}>
          {loading ? `Evaluating ${Math.min(results.length + 1, items.length)} / ${items.length}...` : 'Run Bulk Evaluation'}
        </button>
        {error && <div style={{ marginTop: 12, color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
      </div>

      {results.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 14px' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', color: '#1a1a2e', margin: 0 }}>Results</h2>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{results.length}/{items.length} processed</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    {r.name || `Test Case Row ${r.rowNumber}`}
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
                  background: '#f0fdfa', 
                  padding: '16px 20px', 
                  borderRadius: 12, 
                  border: '1px solid #99f6e4', 
                  marginBottom: 20,
                  fontSize: '0.82rem',
                  color: '#0f766e',
                  lineHeight: 1.6
                }}>
                  {r.testCase}
                </div>

                {r.evaluationDone && (
                  <>
                    <div style={{ 
                      background: '#fff', 
                      border: '1.5px solid #0d948820', 
                      borderRadius: 16, 
                      padding: '18px',
                      marginBottom: 16
                    }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#0d9488', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>TC ANALYSIS</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                        {['Clarity', 'Traceability', 'Accuracy', 'Completeness', 'Coverage'].map((name, idx) => {
                          const param = r.parameters?.[idx];
                          const score = param?.score || 0;
                          return (
                            <div key={name} style={{ 
                              textAlign: 'center', 
                              padding: '8px', 
                              background: '#f0fdfa', 
                              borderRadius: 10,
                              border: `1px solid ${score === 5 ? '#10b98140' : '#ccfbf1'}`
                            }}>
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#5eead4', marginBottom: 2 }}>{name.charAt(0)}</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 950, color: score === 5 ? '#10b981' : '#0d9488' }}>{score}</div>
                            </div>
                          );
                        })}
                      </div>
                      <p style={{ 
                        marginTop: 14, 
                        fontSize: '0.75rem', 
                        color: '#475569', 
                        fontStyle: 'italic',
                        margin: '14px 0 0 0',
                        lineHeight: 1.5
                      }}>
                        "{r.recommendations?.[0] || "Comprehensive test scenario with clear validation steps."}"
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => onAnalyze && onAnalyze(r.testCase)}
                        style={{
                          background: '#f0f9ff',
                          color: '#0ea5e9',
                          border: '1.5px solid #0ea5e940',
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
                        onMouseOver={(e) => { e.currentTarget.style.background = '#0ea5e9'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.color = '#0ea5e9'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        ANALYZE TEST CASE
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
          </div>

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
  );
}

export default BulkTestCaseEvaluator;
