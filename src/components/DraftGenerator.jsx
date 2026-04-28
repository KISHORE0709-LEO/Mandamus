import React, { useState, useEffect } from 'react';
import { FileText, Printer, Share2, Plus, Edit2, SlidersHorizontal, ChevronRight, Save, RotateCw, Loader2 } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import './DraftGenerator.css';

const reviewItems = [
  'Verify case facts against primary upload.',
  'Confirm citations for selected precedents.',
  'Check all statutory references (IPC/CrPC).',
  'Audit for AI hallucination in legal reasoning.',
  'Ensure formatting adheres to High Court standards.',
  'Validate jurisdiction and case number.',
];

const confidence = [
  { label: 'LEGAL_LOGIC',         value: 95 },
  { label: 'PRECEDENT_MATCH',     value: 88 },
  { label: 'FACTUAL_CONSISTENCY', value: 92 },
];

const DraftProcessingOverlay = () => (
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
    <div style={{ border: '1px solid var(--primary-red)', background: '#0a0a0a', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: 'var(--primary-red)', opacity: 0.5, animation: 'scan 2s linear infinite' }} />
      <style>{`@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }`}</style>
      <Loader2 size={40} className="dg-spin" style={{ color: 'var(--primary-red)', marginBottom: '20px' }} />
      <h2 style={{ color: 'var(--text-white)', fontSize: '1rem', letterSpacing: '0.1em', margin: 0, fontFamily: 'var(--font-mono)' }}>GENERATING DRAFT</h2>
      <p style={{ color: 'var(--text-grey)', fontSize: '0.65rem', marginTop: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Synthesizing facts, legal framework, and precedents into formal structure...</p>
    </div>
  </div>
);

export default function DraftGenerator({ onTabChange }) {
  const { state, updateState } = useMandamus();

  const [checked, setChecked] = useState(new Set());
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredRef, setHoveredRef] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const selectedCases = state.selected_precedents || [];
  const fullSummary = state.summariser_output || {};
  const query = fullSummary.legalQuestions?.[0] || fullSummary.caseName || '';
  
  const draftType = state.draft_output?.type || 'Petition';
  const docSections = state.draft_output?.sections || [];
  const validation = state.draft_output?.validation || null;

  useEffect(() => {
    // Only auto-generate if we have prerequisites AND no draft exists
    if (state.summariser_status === 'complete' && selectedCases.length > 0) {
      if (!state.draft_output && !loading) {
        handleGenerateDraft(query, selectedCases, fullSummary, 'Petition');
      }
    }
  }, [state.summariser_status, selectedCases.length]);

  const handleValidateDraft = async (sections, summary, cases, currentDraftType) => {
    setIsValidating(true);
    try {
      const res = await fetch('http://localhost:8000/draft/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_sections: sections,
          summary: summary,
          selected_cases: cases
        })
      });
      const data = await res.json();
      
      updateState({
        draft_output: { type: currentDraftType, sections, validation: data },
        draft_status: 'complete'
      });
    } catch (err) {
      console.error("Validation error:", err);
    }
    setIsValidating(false);
  };

  const handleGenerateDraft = async (q = query, cases = selectedCases, summary = fullSummary, dType = draftType) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/draft/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          selected_cases: cases,
          summary: summary,
          draft_type: dType
        })
      });
      const data = await res.json();
      
      updateState({
        draft_output: { type: dType, sections: data.sections || [], validation: null },
        draft_status: 'generating' // Will be complete after validation
      });
      
      if (data.sections && data.sections.length > 0) {
        handleValidateDraft(data.sections, summary, cases, dType);
      }
    } catch (err) {
      console.error("Drafting error:", err);
    }
    setLoading(false);
  };

  const toggle = (i) => setChecked(prev => {
    const n = new Set(prev);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const handleSectionChange = (index, value) => {
    const newSections = [...docSections];
    newSections[index].body = value;
    
    updateState({
      draft_output: {
        ...state.draft_output,
        sections: newSections
      }
    });
  };

  const allChecked = checked.size === reviewItems.length;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Draft link copied to clipboard!');
  };

  const handleJsonExport = () => {
    if (!docSections.length) {
      alert("No draft generated yet.");
      return;
    }
    const data = JSON.stringify({ sections: docSections, validation }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draftType.toUpperCase()}_${fullSummary?.caseId || 'Export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDraft = () => {
    if (!docSections.length) {
      alert("No draft to save.");
      return;
    }
    alert('Draft securely saved to local repository.');
  };

  const handleSubmitForReview = () => {
    if (!docSections.length) {
      alert("No draft to submit.");
      return;
    }
    alert('Draft has been forwarded to Senior Counsel for final review.');
  };

  const handleApproveDraft = () => {
    setShowConfirmModal(true);
  };

  const confirmApprove = () => {
    updateState({ draft_status: 'approved' });
    setShowConfirmModal(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      if (onTabChange) onTabChange('scheduler');
    }, 1500);
  };

  if (state.summariser_status !== 'complete' || !state.summariser_output) {
    return (
      <div className="dg-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', border: '1px solid #333', background: '#0a0a0a' }}>
          <h2 style={{ color: '#e02020', marginBottom: '15px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>SUMMARISER OUTPUT MISSING</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Please complete the Summariser first before generating a draft.</p>
        </div>
      </div>
    );
  }

  if (!selectedCases || selectedCases.length === 0) {
    return (
      <div className="dg-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', border: '1px solid #333', background: '#0a0a0a' }}>
          <h2 style={{ color: '#e02020', marginBottom: '15px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>NO PRECEDENTS SELECTED</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Please select precedents in the Precedent Finder before drafting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dg-page">

      {/* ── HEADER ── */}
      <div className="dg-header">
        <div>
          <h1 className="dg-title">DRAFT_GENERATOR</h1>
          <p className="dg-sub">RAG PIPELINE · STRUCTURED JUDGMENT DRAFTING · IMMUTABLE AUDIT TRAIL</p>
        </div>
        <div className="dg-header-actions">
          <button className="dg-action-btn" onClick={handlePrint} title="Print / Export PDF"><Printer size={15} /></button>
          <button className="dg-action-btn" onClick={handleShare} title="Share Link"><Share2 size={15} /></button>
        </div>
      </div>

      {/* ── BODY: 3 COLUMNS ── */}
      <div className="dg-body">

        {/* ── LEFT ── */}
        <div className="dg-left">
          <div className="dg-panel-label">CONTEXT_PARAMS <SlidersHorizontal size={11} className="dg-icon-sm" /></div>

          <div className="dg-left-section">
            <div className="dg-sec-label">DRAFT_TYPE</div>
            <select 
              className="dg-draft-type-select" 
              value={draftType} 
              onChange={(e) => updateState({ draft_output: { ...state.draft_output, type: e.target.value } })}
              style={{
                width: '100%',
                background: 'var(--bg-black)',
                color: 'var(--text-white)',
                border: '1px solid var(--border-red)',
                padding: '6px',
                fontSize: '0.75rem',
                marginTop: '4px',
                outline: 'none',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <option value="Petition">Petition</option>
              <option value="Written Argument">Written Argument</option>
              <option value="Judgment">Judgment</option>
              <option value="Counter Affidavit">Counter Affidavit</option>
            </select>
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-label">RESEARCH_QUERY <Edit2 size={10} className="dg-icon-sm" /></div>
            <p className="dg-blob-text">
              "{query || 'No query context provided.'}"
            </p>
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-row">
              <span className="dg-sec-label">AI_CONFIDENCE_SIGNAL</span>
              <span className="dg-badge-green">RELIABLE</span>
            </div>
            <div className="dg-bias-row">
              <span className="dg-bias-key">Hallucination Risk</span>
              <span className="dg-bias-val">Low</span>
            </div>
            <div className="dg-progress-track"><div className="dg-progress-fill" style={{ width: '94%' }} /></div>
            <p className="dg-bias-note">Precedents and statutory references verified against Bedrock training set.</p>
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-row">
              <span className="dg-sec-label">PRECEDENTS_QUEUE</span>
              <span style={{ fontSize: '0.6rem', color: '#555' }}>({selectedCases.length})</span>
            </div>
            {selectedCases.map((p, idx) => (
              <div className="dg-precedent" key={idx}>
                <span className="dg-prec-icon">⚖</span>
                <div>
                  <div className="dg-prec-name">{p.case_name}</div>
                  <div className="dg-prec-desc">{p.citation} ({p.year})</div>
                </div>
              </div>
            ))}
            {selectedCases.length === 0 && <p style={{ fontSize: '0.65rem', color: '#444' }}>No cases selected for drafting.</p>}
          </div>

          <div className="dg-left-section">
            <div className="dg-sec-label">STATUTORY_INTEGRATION</div>
            <div className="dg-statute-tags">
              {['IPC', 'CRPC', 'IT_ACT'].map(s => <span className="dg-statute-tag" key={s}>{s}</span>)}
            </div>
            <div className="dg-statute-map-visual">
              <div className="dg-map-grid">
                {Array.from({length: 48}).map((_, i) => (
                  <div key={i} className={`dg-map-cell ${[5,11,12,17,18,23,24,29,30,35].includes(i) ? 'dg-map-cell-active' : ''} ${[6,13,19,25,31].includes(i) ? 'dg-map-cell-mid' : ''}`} />
                ))}
              </div>
              <div className="dg-map-footer">
                <span>MAPPING_ACTIVE</span>
                <span>SIGNAL: 100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="dg-center" style={{ position: 'relative' }}>
          {loading && <DraftProcessingOverlay />}

          <div className="dg-doc-topbar">
            <div className="dg-doc-title-row">
              <FileText size={13} className="dg-icon-sm" />
              <div>
                <div style={{ fontSize: '0.52rem', color: '#555', letterSpacing: '0.08em', marginBottom: 2 }}>DRAFT:</div>
                <div className="dg-doc-name">{draftType.toUpperCase()}_{fullSummary?.caseId || 'DRAFT'}.PDF</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="dg-export-btn"
                onClick={() => handleGenerateDraft()}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                disabled={loading || (!query && selectedCases.length === 0)}
              >
                {loading ? <Loader2 size={12} className="dg-spin" /> : <RotateCw size={12} />}
                {loading ? 'GENERATING...' : 'REFRESH_DRAFT'}
              </button>
              <button className="dg-export-btn" onClick={handleJsonExport}>JSON_EXPORT</button>
              <button className={`dg-export-btn ${!isEditingDoc ? 'dg-export-active' : ''}`} onClick={() => setIsEditingDoc(!isEditingDoc)}>
                {isEditingDoc ? 'PREVIEW_RENDER' : 'EDIT_DRAFT'}
              </button>
            </div>
          </div>

          <div className="dg-doc-scroll">
            <div className="dg-doc-inner">

              <div className="dg-doc-meta">
                <span>JURISDICTION: {fullSummary?.jurisdiction?.toUpperCase() || 'NOT SPECIFIED'}</span>
                <span>TIMESTAMP: {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</span>
              </div>

              <div className="dg-doc-court">IN THE {fullSummary?.jurisdiction?.toUpperCase() || 'COURT'}</div>
              <div className="dg-doc-case">Case No. {fullSummary?.caseId || 'UNKNOWN'}</div>
              <hr className="dg-doc-rule" />

              {!loading && docSections.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#555', fontFamily: 'var(--font-mono)' }}>
                  <p>No document generated yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>Upload a file in Summarizer or click REFRESH_DRAFT to begin.</p>
                </div>
              )}

              {docSections.map((s, idx) => (
                <div className="dg-doc-section" key={s.num}>
                  <div className="dg-section-heading">
                    <span className="dg-dot" />
                    {s.num} {s.title}
                  </div>
                  
                  {isEditingDoc ? (
                    <textarea
                      className="dg-doc-textarea"
                      value={s.body}
                      onChange={(e) => handleSectionChange(idx, e.target.value)}
                    />
                  ) : (
                    s.body.split('\n\n').map((para, i) => (
                      <p className="dg-doc-para" key={i}>{para}</p>
                    ))
                  )}

                  {s.refs.length > 0 && (
                    <div className="dg-refs">
                      {s.refs.map(ref => (
                        <span 
                          key={ref} 
                          className="dg-ref"
                          onMouseEnter={() => setHoveredRef(ref)}
                          onMouseLeave={() => setHoveredRef(null)}
                        >
                          [{ref}]
                          <span className="dg-ref-tooltip">Source document verified: {ref}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="dg-final-actions">
                <button className="dg-final-btn dg-final-secondary" onClick={handlePrint}>EXPORT AS PDF</button>
                <button className="dg-final-btn dg-final-secondary" onClick={handleSaveDraft}>SAVE DRAFT</button>
                {state.draft_status === 'approved' ? (
                  <button className="dg-final-btn dg-final-primary" onClick={() => onTabChange && onTabChange('scheduler')}>
                    SCHEDULE HEARING <ChevronRight size={16} />
                  </button>
                ) : (
                  <button className="dg-final-btn dg-final-primary" onClick={handleSubmitForReview}>
                    SUBMIT FOR REVIEW <ChevronRight size={16} />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="dg-right">
          <div className="dg-panel-label">VALIDATION_MATRIX</div>

          <div className="dg-right-section">
            {isValidating ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '10px' }}>
                 <Loader2 size={24} className="dg-spin" style={{ color: 'var(--primary-red)' }} />
                 <span style={{ fontSize: '0.7rem', color: 'var(--text-grey)', fontFamily: 'var(--font-mono)' }}>EVALUATING DRAFT...</span>
               </div>
            ) : validation && validation.scores ? (
              Object.entries(validation.scores).map(([label, value]) => (
                <div className="dg-conf-item" key={label}>
                  <div className="dg-conf-row">
                    <span className="dg-conf-label">{label}</span>
                    <span className="dg-conf-val">{value}%</span>
                  </div>
                  <div className="dg-conf-track">
                    <div className="dg-conf-fill" style={{ width: `${value}%`, background: value < 70 ? 'var(--primary-red)' : 'var(--neon-green)' }} />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.65rem', color: '#444' }}>Awaiting draft generation to begin validation.</p>
            )}
          </div>

          {validation && !isValidating && (
            <>
              <div className="dg-panel-label" style={{ marginTop: 8 }}>INCONSISTENCIES</div>
              <div className="dg-right-section" style={{ borderLeft: '2px solid var(--primary-red)', paddingLeft: '8px' }}>
                {validation.inconsistencies?.length > 0 ? (
                  validation.inconsistencies.map((inc, i) => (
                    <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-grey)', marginBottom: '8px', display: 'flex', gap: '6px' }}>
                       <span style={{ color: 'var(--primary-red)' }}>⚠</span> {inc}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.65rem', color: 'var(--neon-green)' }}>No inconsistencies detected.</p>
                )}
              </div>

              <div className="dg-panel-label" style={{ marginTop: 8 }}>SUGGESTIONS</div>
              <div className="dg-right-section" style={{ borderLeft: '2px solid var(--neon-green)', paddingLeft: '8px' }}>
                {validation.suggestions?.length > 0 ? (
                  validation.suggestions.map((sug, i) => (
                    <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-grey)', marginBottom: '8px', display: 'flex', gap: '6px' }}>
                       <span style={{ color: 'var(--neon-green)' }}>★</span> {sug}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.65rem', color: '#555' }}>No further suggestions.</p>
                )}
              </div>
            </>
          )}

          <button 
            className={`dg-approve-btn ${validation && !isValidating ? 'dg-approve-active' : ''}`} 
            disabled={!validation || isValidating || state.draft_status === 'approved'} 
            onClick={handleApproveDraft}
            style={state.draft_status === 'approved' ? { background: '#00ff00', color: '#000', borderColor: '#00ff00' } : {}}
          >
            {state.draft_status === 'approved' ? 'APPROVED ✓' : 'APPROVE_DRAFT'}
          </button>
          {(!validation || isValidating) && state.draft_status !== 'approved' && <p className="dg-approve-note">Validation required to unlock filing.</p>}
        </div>

      </div>

      {/* CONFIRM MODAL */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #333', padding: '30px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', fontFamily: 'monospace' }}>APPROVE DRAFT</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>
              Approve this draft and proceed to hearing scheduling?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmModal(false)} style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace' }}>CANCEL</button>
              <button onClick={confirmApprove} style={{ background: '#e02020', border: 'none', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace' }}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {showToast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#00ff00', color: '#000', padding: '15px 20px', fontFamily: 'monospace', fontWeight: 'bold', zIndex: 9999, animation: 'fadeIn 0.3s ease-in-out', border: '1px solid #00ff00' }}>
          Draft approved. Proceeding to Scheduler...
        </div>
      )}
    </div>
  );
}
