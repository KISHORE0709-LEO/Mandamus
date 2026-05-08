import React, { useState, useEffect, useRef } from 'react';
import { FileUp, CheckCircle2, Search, ChevronRight, Download, Edit3, ThumbsUp, RotateCcw, FileText, Save, ArrowRight, X } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import './Summarizer.css';
import LegalChat from './LegalChat';

/* ─── PROCESSING STAGES ─── */
const STAGES = [
  { id: 'upload',    label: 'UPLOADING FILE',        sub: 'Streaming document to neural buffer…' },
  { id: 'ocr',       label: 'OCR PROCESSING',        sub: 'Extracting text layers via optical scan…' },
  { id: 'nlp',       label: 'NLP SUMMARISATION',     sub: 'Deep-parsing semantic entities…' },
  { id: 'structure',  label: 'STRUCTURING OUTPUT',   sub: 'Compiling structured case abstract…' },
  { id: 'done',      label: 'COMPLETED',             sub: 'Analysis pipeline complete.' },
];

/* ─── CONFIDENCE RING ─── */
const ConfidenceRing = ({ percent = 92 }) => {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const fill = (percent / 100) * circ;
  return (
    <div className="sr-ring-wrap">
      <svg viewBox="0 0 160 160" className="sr-ring-svg">
        <circle cx="80" cy="80" r={r} className="sr-ring-track" />
        <circle cx="80" cy="80" r={r} className="sr-ring-fill"
          strokeDasharray={`${fill} ${circ}`} />
      </svg>
      <div className="sr-ring-center">
        <span className="sr-ring-pct">{percent}%</span>
        <span className="sr-ring-lbl">VERIFIED</span>
      </div>
    </div>
  );
};

/* ─── PROCESSING OVERLAY ─── */
const ProcessingOverlay = ({ currentStage, onComplete }) => {
  const stageIdx = STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className="sr-process-overlay">
      <div className="sr-process-card">
        {/* Scanline effect */}
        <div className="sr-scanline" />

        <div className="sr-process-header">
          <div className="sr-process-icon-wrap">
            <div className="sr-pulse-ring" />
            <div className="sr-pulse-ring sr-pulse-ring-2" />
            <div className="sr-process-icon">
              {currentStage === 'done' ? <CheckCircle2 size={28} /> : <div className="sr-spinner" />}
            </div>
          </div>
          <h2 className="sr-process-title">
            {currentStage === 'done' ? 'ANALYSIS COMPLETE' : 'NEURAL PROCESSING'}
          </h2>
          <p className="sr-process-sub">
            {STAGES[stageIdx]?.sub || ''}
          </p>
        </div>

        {/* Stage pipeline */}
        <div className="sr-pipeline">
          {STAGES.map((stage, i) => {
            const isActive = i === stageIdx;
            const isDone = i < stageIdx;
            const isPending = i > stageIdx;
            return (
              <React.Fragment key={stage.id}>
                <div className={`sr-stage ${isDone ? 'sr-stage-done' : ''} ${isActive ? 'sr-stage-active' : ''} ${isPending ? 'sr-stage-pending' : ''}`}>
                  <div className="sr-stage-dot">
                    {isDone ? <CheckCircle2 size={14} /> : <span className="sr-stage-num">{String(i + 1).padStart(2, '0')}</span>}
                  </div>
                  <span className="sr-stage-label">{stage.label}</span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`sr-stage-connector ${isDone ? 'sr-connector-done' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="sr-progress-track">
          <div
            className="sr-progress-fill"
            style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
          />
        </div>

        {currentStage === 'done' && (
          <button className="sr-process-proceed" onClick={onComplete}>
            VIEW RESULTS <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── MAIN SUMMARIZER ─── */
export default function Summarizer({ onTabChange }) {
  const { state, updateState, reinitialize } = useMandamus();
  const phase = state.summariser_status; 
  const summaryData = state.summariser_output || {};

  const [currentStage, setCurrentStage] = useState('upload');
  const [editMode, setEditMode] = useState(false);
  const [approved, setApproved] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [viewMode, setViewMode] = useState('lawyer'); // 'lawyer' | 'student'
  
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Auto-calculate pending duration if backend returns N/A
  const computePendingDuration = (filing) => {
    if (!filing || filing === 'N/A') return 'PENDING';
    const match = filing.match(/(\d{4})/);
    if (!match) return filing;
    const year = parseInt(match[1]);
    const diff = new Date().getFullYear() - year;
    if (diff <= 0) return 'RECENT FILING';
    return `${diff}Y PENDING`;
  };

  const pendingDisplay = (summaryData.pendingDuration && summaryData.pendingDuration !== 'N/A')
    ? summaryData.pendingDuration
    : computePendingDuration(summaryData.filing);

  const handleUpdateSummary = (updates) => {
    updateState({ summariser_output: { ...summaryData, ...updates } });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg("Please upload a PDF file.");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
  };

  const startProcessing = async () => {
    if (!selectedFile) {
      setErrorMsg("Please select a file first.");
      return;
    }
    
    updateState({ summariser_status: 'processing' });
    setCurrentStage('upload');
    setApproved(false);
    setEditMode(false);
    setErrorMsg(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/summarise`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep incomplete part
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.processing_status === 'failed') {
                   throw new Error(data.error);
                } else if (data.processing_status === 'complete') {
                   const parsedData = {
                     caseName: data.case_id || 'UNKNOWN CASE',
                     caseId: data.case_id || 'UNKNOWN ID',
                     jurisdiction: data.court_name || 'UNKNOWN JURISDICTION',
                     filing: data.filing_date || 'N/A',
                     pendingDuration: data.pending_duration || 'N/A',
                     petitioner: data.petitioner || 'UNKNOWN',
                     petitionerCounsel: data.petitioner_counsel || 'UNKNOWN',
                     respondent: data.respondent || 'UNKNOWN',
                     respondentCounsel: data.respondent_counsel || 'UNKNOWN',
                     plainSummary: data.plain_summary || '',
                     facts: data.key_facts || [],
                     legalQuestions: data.core_legal_questions || [],
                     ipcSections: (data.ipc_sections || []).sort((a, b) => (a.section || "").localeCompare(b.section || "", undefined, {numeric: true, sensitivity: 'base'})),
                     evidence: (data.evidence || []).sort((a, b) => {
                       const nameA = typeof a === 'string' ? a : (a.name || "");
                       const nameB = typeof b === 'string' ? b : (b.name || "");
                       return nameA.localeCompare(nameB);
                     }),
                     caseType: data.case_type || 'UNKNOWN',
                     isUndertrial: data.is_undertrial || false,
                     confidenceScore: data.confidence_score || 0,
                     argumentStrength: data.argument_strength || {},
                     proceduralPath: data.procedural_path || [],
                     caseOutcomeAnalysis: data.case_outcome_analysis || {},
                     studentMode: data.student_mode || null,
                     processingTime: data.processing_time || 0,
                     extractionMethod: data.extraction_method || ''
                   };
                   updateState({ summariser_output: parsedData, case_id: parsedData.caseId });
                   setCurrentStage('done');
                   setTimeout(() => updateState({ summariser_status: 'complete' }), 1500);
                } else {
                   const stageMap = {
                     uploading: 'upload',
                     extracting: 'ocr',
                     summarising: 'nlp',
                     structuring: 'structure'
                   };
                   if (stageMap[data.processing_status]) {
                     setCurrentStage(stageMap[data.processing_status]);
                   }
                }
              } catch (err) {
                 if (err.message && !err.message.includes("JSON")) {
                   throw err;
                 }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during processing.");
      updateState({ summariser_status: 'idle' });
    }
  };

  useEffect(() => {
    // cleanup not needed for fetch stream directly since it auto-cancels when unmounted, 
    // but preserving hook structure
  }, []);

  const handleRegenerate = () => {
    setApproved(false);
    setEditMode(false);
    startProcessing();
  };

  const handleReinitialize = () => {
    if (window.confirm("This will clear all case data including precedents, draft and schedule. Are you sure?")) {
      reinitialize();
    }
  };

  const handleDownload = () => {
    const textContent = `CASE ABSTRACT: ${summaryData.caseName}
ID: ${summaryData.caseId} | JURISDICTION: ${summaryData.jurisdiction}
--------------------------------------------------
PETITIONER: ${summaryData.petitioner} (Counsel: ${summaryData.petitionerCounsel})
RESPONDENT: ${summaryData.respondent} (Counsel: ${summaryData.respondentCounsel})
--------------------------------------------------
FACTS:
${summaryData.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}
--------------------------------------------------
LEGAL QUESTIONS:
${summaryData.legalQuestions.map((q, i) => `- ${q}`).join('\n')}
--------------------------------------------------
STATUTES:
${(summaryData.ipcSections || []).map(s => `${s.section}: ${s.description}`).join('\n')}
--------------------------------------------------
CONFIDENCE: ${summaryData.confidenceScore}%`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summaryData.caseId || 'case'}_Abstract.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFeatureNotReady = (feature) => {
    alert(`[SYSTEM_NOTICE]: The ${feature} module is currently offline or requires further integration.`);
  };

  const handleSendToPrecedent = () => {
    if (onTabChange) onTabChange('precedent');
  };

  /* ─── IDLE STATE ─── */
  if (phase === 'idle') {
    return (
      <div className="sr-page">
        <div className="sr-header">
          <div>
            <h1 className="sr-title">NEURAL_SUMMARIZER</h1>
            <p className="sr-sub">ASYNCHRONOUS DEEP-PARSING PROTOCOL V4.02 — UPLOAD CASE FILES FOR MULTI-LAYERED ANALYSIS.</p>
          </div>
          <svg className="sr-brain" viewBox="0 0 64 64" fill="none">
            <circle cx="29" cy="21" r="14" fill="#e02020"/>
            <path d="M11 58c0-9.94 8.06-18 18-18s18 8.06 18 18" fill="#e02020"/>
            <circle cx="48" cy="17" r="9" fill="#0d0d0d"/>
            <path d="M48 10v2M48 22v2M41 17h2M53 17h2M43.1 12.1l1.4 1.4M51.5 20.5l1.4 1.4M43.1 21.9l1.4-1.4M51.5 13.5l1.4-1.4"
              stroke="#e02020" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="48" cy="17" r="3.2" fill="#e02020"/>
          </svg>
        </div>

        <div className="sr-ingest">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="application/pdf" 
            style={{ display: 'none' }} 
          />
          <div className="sr-drop" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={38} className="sr-drop-icon" />
            <span>{selectedFile ? selectedFile.name : 'CLICK OR DROP PDF TO UPLOAD'}</span>
          </div>
          <div className="sr-ingest-col">
            <div className="sr-metric">
              <span className="sr-metric-lbl">CURRENT_BATCH_SIZE</span>
              <span className="sr-metric-val">{selectedFile ? (selectedFile.size / 1024).toFixed(2) + ' KB' : '0.00 KB'}</span>
            </div>
            <button className="sr-scan-btn" onClick={startProcessing}>INITIALIZE SCAN</button>
          </div>
        </div>
        {errorMsg && <div style={{ color: '#ff2a2a', marginTop: '10px', textAlign: 'center', fontFamily: 'monospace' }}>[ERROR] {errorMsg}</div>}
      </div>
    );
  }

  /* ─── PROCESSING STATE ─── */
  if (phase === 'processing') {
    return (
      <div className="sr-page">
        <div className="sr-header">
          <div>
            <h1 className="sr-title">NEURAL_SUMMARIZER</h1>
            <p className="sr-sub">ASYNCHRONOUS DEEP-PARSING PROTOCOL V4.02 — PROCESSING IN PROGRESS.</p>
          </div>
          <svg className="sr-brain" viewBox="0 0 64 64" fill="none">
            <circle cx="29" cy="21" r="14" fill="#e02020"/>
            <path d="M11 58c0-9.94 8.06-18 18-18s18 8.06 18 18" fill="#e02020"/>
            <circle cx="48" cy="17" r="9" fill="#0d0d0d"/>
            <path d="M48 10v2M48 22v2M41 17h2M53 17h2M43.1 12.1l1.4 1.4M51.5 20.5l1.4 1.4M43.1 21.9l1.4-1.4M51.5 13.5l1.4-1.4"
              stroke="#e02020" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="48" cy="17" r="3.2" fill="#e02020"/>
          </svg>
        </div>
        <ProcessingOverlay currentStage={currentStage} onComplete={() => updateState({ summariser_status: 'complete' })} />
      </div>
    );
  }

  /* ─── RESULTS STATE ─── */
  if (phase === 'complete') {
    // Pre-compute student mode content (avoids IIFE in JSX)
    const studentFacts = summaryData.studentMode?.key_facts?.length
      ? summaryData.studentMode.key_facts
      : (summaryData.plainSummary
          ? (summaryData.plainSummary.match(/[^.!?]+[.!?]+/g) || []).map(s => s.trim()).filter(Boolean)
          : summaryData.facts || []);
    const studentQuestions = summaryData.studentMode?.legal_questions?.length
      ? summaryData.studentMode.legal_questions
      : (summaryData.legalQuestions || []);
    const studentOutcome = summaryData.studentMode?.outcome_explanation || summaryData.plainSummary || 'Analysis pending.';

    return (
      <div className="sr-page sr-complete-view">
        <div className="sr-header">
          <div>
            <h1 className="sr-title">NEURAL_SUMMARIZER</h1>
            <p className="sr-sub">ANALYSIS_PROTOCOL_COMPLETE · CASE_ID: {summaryData.caseId || 'UNKNOWN'} · JURISDICTION: {summaryData.jurisdiction || 'NOT_SPECIFIED'}</p>
          </div>
          <svg className="sr-brain" viewBox="0 0 64 64" fill="none">
            <circle cx="29" cy="21" r="14" fill="#e02020"/>
            <path d="M11 58c0-9.94 8.06-18 18-18s18 8.06 18 18" fill="#e02020"/>
            <circle cx="48" cy="17" r="9" fill="#0d0d0d"/>
            <path d="M48 10v2M48 22v2M41 17h2M53 17h2M43.1 12.1l1.4 1.4M51.5 20.5l1.4 1.4M43.1 21.9l1.4-1.4M51.5 13.5l1.4-1.4"
              stroke="#e02020" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="48" cy="17" r="3.2" fill="#e02020"/>
          </svg>
        </div>


        <div className="sr-layout-grid">
          {/* ── LEFT SIDEBAR ── */}
          <div className="sr-sidebar">
            
            <div className="sr-sidebar-top">
              <div className="sr-tabs">
                <div className={`sr-tab ${viewMode === 'lawyer' ? 'sr-tab-active' : ''}`} onClick={() => setViewMode('lawyer')}>LAWYER</div>
                <div className={`sr-tab ${viewMode === 'student' ? 'sr-tab-active' : ''}`} onClick={() => setViewMode('student')}>STUDENT</div>
              </div>
              <div className="sr-risk-badge">● {summaryData.argumentStrength?.petitioner > 60 ? 'HIGH RISK' : 'MODERATE RISK'}</div>
            </div>

            <div className="sr-side-card sr-confidence-card">
              <ConfidenceRing percent={summaryData.confidenceScore || 0} />
              <div className="sr-conf-lbl">CONFIDENCE SCORE INDEX</div>
            </div>

            <div className="sr-side-card">
              <div className="sr-side-title">
                <div className="sr-bar-icon" /> ARGUMENT STRENGTH
              </div>
              <div className="sr-arg-row">
                <div className="sr-arg-labels">
                  <span>PETITIONER</span>
                  <span>{summaryData.argumentStrength?.petitioner || 65}%</span>
                </div>
                <div className="sr-arg-track"><div className="sr-arg-fill" style={{width: `${summaryData.argumentStrength?.petitioner || 65}%`, background: '#ff2a2a'}} /></div>
              </div>
              <div className="sr-arg-row" style={{marginTop: '15px'}}>
                <div className="sr-arg-labels">
                  <span>RESPONDENT</span>
                  <span>{summaryData.argumentStrength?.respondent || 40}%</span>
                </div>
                <div className="sr-arg-track"><div className="sr-arg-fill" style={{width: `${summaryData.argumentStrength?.respondent || 40}%`, background: '#555'}} /></div>
              </div>
            </div>

            <div className="sr-side-card sr-path-card">
              <div className="sr-side-title">
                <div className="sr-path-icon" /> PROCEDURAL PATH
              </div>
              <div className="sr-timeline">
                <div className="sr-tl-item">
                  <div className="sr-tl-dot sr-tl-dot-active" />
                  <div className="sr-tl-content">
                    <div className="sr-tl-date">{summaryData.filing || '12 OCT 2021'}</div>
                    <div className="sr-tl-title">Original Filing</div>
                  </div>
                </div>
                <div className="sr-tl-line" />
                <div className="sr-tl-item">
                  <div className="sr-tl-dot" />
                  <div className="sr-tl-content">
                    <div className="sr-tl-date">24 NOV 2021</div>
                    <div className="sr-tl-title" style={{color: '#888'}}>First Hearing Held</div>
                  </div>
                </div>
                <div className="sr-tl-line" />
                <div className="sr-tl-item">
                  <div className="sr-tl-dot" />
                  <div className="sr-tl-content">
                    <div className="sr-tl-date">CURRENT</div>
                    <div className="sr-tl-title" style={{color: '#888'}}>Awaiting Final Decree</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── EVIDENCE METADATA ── */}
            <div className="sr-side-card sr-evidence-card">
              <div className="sr-side-title">
                <div className="sr-path-icon" /> EVIDENCE METADATA
              </div>
              <div className="sr-ev-list">
                {(summaryData.evidence || []).length === 0 ? (
                  <div className="sr-ev-empty">No evidence extracted.</div>
                ) : (
                  <>
                    {(summaryData.evidence || []).map((ev, i) => {
                      const name = typeof ev === 'string' ? ev : (ev.name || String(ev));
                      const type = typeof ev === 'object' ? (ev.type || 'Document') : 'Document';
                      return (
                        <div className="sr-ev-row" key={i}>
                          <div className="sr-ev-info">
                            <div className="sr-ev-name">{name}</div>
                            <div className="sr-ev-type-tag">{type}</div>
                          </div>
                          <div className="sr-ev-status">✓</div>
                        </div>
                      );
                    })}
                    {(summaryData.evidence || []).every(e => {
                      const n = typeof e === 'string' ? e : (e.name || '');
                      return n === 'Case Records' || n === 'Petition Documents';
                    }) && (
                      <div className="sr-ev-note">No physical evidence cited. Showing procedural records.</div>
                    )}
                  </>
                )}
              </div>
            </div>
            
          </div>

          {/* ── RIGHT MAIN CONTENT ── */}
          <div className="sr-main">
            
            {/* Header Box */}
            <div className="sr-main-header">
              <div className="sr-header-left">
                <div className="sr-header-meta">
                  <span className="sr-tag-red">{summaryData.caseType || 'CRIMINAL_PETITION'}</span>
                  <span className="sr-case-id-txt">CASE_ID: {summaryData.caseId || 'ND-2024-991A'}</span>
                </div>
                {editMode ? (
                  <input
                    className="sr-edit-input sr-edit-case-name"
                    value={summaryData.caseName}
                    onChange={e => handleUpdateSummary({ caseName: e.target.value })}
                  />
                ) : (
                  <h1 className="sr-main-title">{summaryData.caseName || 'STATE VS. MALHOTRA'}</h1>
                )}
                <div className="sr-header-icons">
                  <span><span className="sr-icon-lbl">COURT</span>{summaryData.jurisdiction || 'DELHI HIGH COURT'}</span>
                  <span className="sr-icon-sep">·</span>
                  <span><span className="sr-icon-lbl">FILED</span>{summaryData.filing || '12-OCT-2021'}</span>
                  <span className="sr-icon-sep">·</span>
                  <span className="sr-pending-chip">⏱ {pendingDisplay}</span>
                </div>
              </div>
              <div className="sr-header-actions">
                <button className="sr-action-btn" onClick={handleReinitialize}>
                  <FileUp size={13} /> NEW PDF
                </button>
                <button className={`sr-action-btn ${editMode ? 'sr-action-btn-active' : ''}`} onClick={() => setEditMode(!editMode)}>
                  <Edit3 size={13} /> {editMode ? 'DONE' : 'EDIT'}
                </button>
                <button className="sr-action-btn" onClick={handleDownload}>
                  <Download size={13} /> PDF EXPORT
                </button>
                <button className={`sr-action-btn sr-action-approve ${approved ? 'sr-action-btn-approved' : ''}`} onClick={() => setApproved(!approved)}>
                  <ThumbsUp size={13} /> {approved ? 'APPROVED' : 'APPROVE'}
                </button>
              </div>
            </div>

            {/* Row 1: Parties and Outcome */}
            <div className="sr-row-1">
              <div className="sr-parties-col">
                <div className="sr-party-card">
                  <div className="sr-party-lbl">PETITIONER</div>
                  {editMode ? (
                    <>
                      <input className="sr-edit-input" value={summaryData.petitioner || ''} onChange={e => handleUpdateSummary({ petitioner: e.target.value})} placeholder="Name" style={{marginBottom: '5px'}} />
                      <input className="sr-edit-input sr-edit-sm" value={summaryData.petitionerCounsel || ''} onChange={e => handleUpdateSummary({ petitionerCounsel: e.target.value})} placeholder="Counsel" />
                    </>
                  ) : (
                    <>
                      <div className="sr-party-val">{summaryData.petitioner || 'Adv. General Rajesh Shirodkar'}</div>
                      <div className="sr-party-sub">{summaryData.petitionerCounsel || 'DEPT OF HOME AFFAIRS'}</div>
                    </>
                  )}
                </div>
                <div className="sr-party-card">
                  <div className="sr-party-lbl" style={{color: '#ff2a2a'}}>RESPONDENT</div>
                  {editMode ? (
                    <>
                      <input className="sr-edit-input" value={summaryData.respondent || ''} onChange={e => handleUpdateSummary({ respondent: e.target.value})} placeholder="Name" style={{marginBottom: '5px'}} />
                      <input className="sr-edit-input sr-edit-sm" value={summaryData.respondentCounsel || ''} onChange={e => handleUpdateSummary({ respondentCounsel: e.target.value})} placeholder="Counsel" />
                    </>
                  ) : (
                    <>
                      <div className="sr-party-val">{summaryData.respondent || 'Anish Malhotra'}</div>
                      <div className="sr-party-sub">{summaryData.respondentCounsel || 'S. CHATTERJEE & ASSOCIATES'}</div>
                    </>
                  )}
                </div>
              </div>

              <div className="sr-outcome-card">
                <div className="sr-outcome-lbl">CASE OUTCOME ANALYSIS V1.2</div>
                <div className="sr-outcome-content">
                  <div className="sr-outcome-icon-box">
                    <ArrowRight size={24} color="#fff" style={{transform: 'rotate(-45deg)'}} />
                  </div>
                  <div>
                    <div className="sr-outcome-title">{summaryData.caseOutcomeAnalysis?.title || 'FAVORABLE JUDGMENT'}</div>
                    <div className="sr-outcome-sub">PROBABILITY: {summaryData.caseOutcomeAnalysis?.probability_score ? `${summaryData.caseOutcomeAnalysis.probability_score}%` : 'HIGH (84%)'} — FAVOURS {summaryData.caseOutcomeAnalysis?.favours || summaryData.petitioner || 'PETITIONER'}</div>
                  </div>
                </div>
                <p className="sr-outcome-desc">
                  {summaryData.caseOutcomeAnalysis?.description || `AI synthesis of similar precedents in ${summaryData.jurisdiction || 'Delhi High Court'} suggests interpretation favoured prosecution in similar filings.`} <span className="sr-highlight">{summaryData.caseOutcomeAnalysis?.key_insight || 'Key Insight: Precedent Applicability'}</span>
                </p>
                <div className="sr-outcome-bg-decor" />
              </div>
            </div>

            {/* Row 2: Facts and Questions — mode-aware */}
            {viewMode === 'student' ? (
              <div className="sr-student-banner">
                <div className="sr-student-badge">📚 STUDENT MODE — SIMPLIFIED BREAKDOWN</div>
                <div className="sr-row-2">
                  <div className="sr-facts-card">
                    <div className="sr-card-heading">
                      <CheckCircle2 size={14} color="#ff2a2a" style={{marginRight: '8px'}} /> WHAT HAPPENED (SIMPLIFIED)
                    </div>
                    <div className="sr-facts-list">
                      {studentFacts.map((txt, i) => (
                        <div className="sr-fact-row" key={i}>
                          <span className="sr-fact-num">{String(i + 1).padStart(2, '0')}</span>
                          <p className="sr-fact-txt">{txt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="sr-questions-card">
                    <div className="sr-card-heading">
                      <span style={{color: '#ff2a2a', marginRight: '8px', fontWeight: 'bold'}}>?</span> LEGAL QUESTIONS (PLAIN ENGLISH)
                    </div>
                    <div className="sr-questions-list">
                      {studentQuestions.map((q, i) => (
                        <div className="sr-question-row" key={i}>
                          <span className="sr-q-icon">—</span>
                          <p className="sr-q-txt">{q}</p>
                        </div>
                      ))}
                    </div>
                    <div className="sr-student-outcome">
                      <div className="sr-student-outcome-lbl">WHAT THIS MEANS FOR COMMON PEOPLE</div>
                      <p className="sr-fact-txt" style={{marginTop: '8px'}}>{studentOutcome}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sr-row-2">
                <div className="sr-facts-card">
                  <div className="sr-card-heading">
                    <CheckCircle2 size={14} color="#ff2a2a" style={{marginRight: '8px'}} /> KEY FACTS
                  </div>
                  <div className="sr-facts-list">
                    {(summaryData.facts || []).map((txt, i) => (
                      <div className="sr-fact-row" key={i}>
                        <span className="sr-fact-num">{String(i + 1).padStart(2, '0')}</span>
                        {editMode ? (
                          <textarea
                            className="sr-edit-textarea"
                            value={txt}
                            onChange={e => {
                              const f = [...summaryData.facts];
                              f[i] = e.target.value;
                              handleUpdateSummary({ facts: f });
                            }}
                          />
                        ) : (
                          <p className="sr-fact-txt">
                            {txt}
                            {i === (summaryData.facts || []).length - 1 && (
                              <span className="sr-risk-point">RISK POINT</span>
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sr-questions-card">
                  <div className="sr-card-heading">
                    <span style={{color: '#ff2a2a', marginRight: '8px', fontWeight: 'bold'}}>?</span> LEGAL QUESTIONS
                  </div>
                  <div className="sr-questions-list">
                    {(summaryData.legalQuestions || []).map((q, i) => (
                      <div className="sr-question-row" key={i}>
                        <span className="sr-q-icon">—</span>
                        {editMode ? (
                          <textarea
                            className="sr-edit-textarea"
                            value={q}
                            onChange={e => {
                              const lq = [...summaryData.legalQuestions];
                              lq[i] = e.target.value;
                              handleUpdateSummary({ legalQuestions: lq });
                            }}
                          />
                        ) : (
                          <p className={`sr-q-txt ${i % 2 !== 0 ? 'sr-q-italic' : ''}`}>{q}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Statutes */}
            <div className="sr-statutes-card">
              <div className="sr-card-heading">
                <div className="sr-stat-icon" /> FLAGGED STATUTES
              </div>
              <div className="sr-statutes-grid">
                {(summaryData.ipcSections || []).map((statute, i) => (
                  <div className="sr-stat-box" key={i}>
                    {editMode ? (
                      <>
                        <input className="sr-edit-input" value={statute.section || ''} onChange={e => { const s = [...summaryData.ipcSections]; s[i].section = e.target.value; handleUpdateSummary({ ipcSections: s}) }} style={{marginBottom: '5px'}} />
                        <textarea className="sr-edit-textarea sr-edit-textarea-sm" value={statute.description || ''} onChange={e => { const s = [...summaryData.ipcSections]; s[i].description = e.target.value; handleUpdateSummary({ ipcSections: s}) }} />
                      </>
                    ) : (
                      <>
                        <div className="sr-stat-code">{statute.section || 'UNKNOWN'}</div>
                        <div className="sr-stat-desc">{statute.description || ''}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Row 4: Help Assistant Chat */}
            <div className="sr-chat-card" style={{ width: '100%', marginBottom: '24px' }}>
              <div className="sr-card-heading">
                 HELP_ASSISTANT
              </div>
              <LegalChat summary={summaryData} context="analysis" />
            </div>

            {/* CTAs */}
            <div className="sr-cta-group">
              <button className="sr-cta sr-cta-primary" onClick={handleSendToPrecedent}>
                <Search size={18} />
                <div className="sr-cta-txt">
                  <span className="sr-cta-main">SEND TO PRECEDENT FINDER</span>
                  <span className="sr-cta-sub">EXECUTE NEURAL DEEP-SEARCH FOR SIMILAR LEGAL PRECEDENTS</span>
                </div>
                <ChevronRight size={20} />
              </button>
              <div className="sr-cta-row">
                <button className="sr-cta sr-cta-secondary" onClick={() => handleFeatureNotReady('DRAFT_GENERATOR')}>
                  <FileText size={16} />
                  <div className="sr-cta-txt">
                    <span className="sr-cta-main">GENERATE DRAFT</span>
                    <span className="sr-cta-sub">AUTO-COMPOSE LEGAL PETITION DRAFT</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
                <button className="sr-cta sr-cta-tertiary" onClick={() => handleFeatureNotReady('SAVE_TO_REPOSITORY')}>
                  <Save size={16} />
                  <div className="sr-cta-txt">
                    <span className="sr-cta-main">SAVE CASE</span>
                    <span className="sr-cta-sub">STORE IN CASE REPOSITORY</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return null;
}
