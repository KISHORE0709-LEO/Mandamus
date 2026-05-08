import re

with open('src/components/Summarizer.jsx', 'r') as f:
    content = f.read()

# Define the start and end markers
start_marker = "  /* ─── RESULTS STATE ─── */\n  if (phase === 'complete') {"
end_marker = "  return null;\n}\n"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_complete_state = """  /* ─── RESULTS STATE ─── */
  if (phase === 'complete') {
    return (
      <div className="sr-page sr-complete-view">
        {/* ── HUMAN-IN-THE-LOOP CONTROLS ── */}
        <div className="sr-hitl-bar">
          <div className="sr-hitl-status">
            {approved ? (
              <span className="sr-hitl-badge sr-hitl-approved"><CheckCircle2 size={13} /> APPROVED BY HUMAN</span>
            ) : (
              <span className="sr-hitl-badge sr-hitl-pending">⚠ AWAITING HUMAN REVIEW</span>
            )}
            <span className="sr-hitl-note">AI-generated output requires human verification before use.</span>
          </div>
          <div className="sr-hitl-actions">
            <button
              className={`sr-hitl-btn sr-hitl-edit ${editMode ? 'sr-hitl-btn-active' : ''}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? <><X size={14} /> EXIT EDIT</> : <><Edit3 size={14} /> EDIT SUMMARY</>}
            </button>
            <button
              className={`sr-hitl-btn sr-hitl-approve ${approved ? 'sr-hitl-btn-active' : ''}`}
              onClick={() => setApproved(!approved)}
            >
              <ThumbsUp size={14} /> {approved ? 'REVOKE APPROVAL' : 'APPROVE AI OUTPUT'}
            </button>
            <button className="sr-hitl-btn sr-hitl-reject" onClick={handleRegenerate}>
              <RotateCcw size={14} /> REJECT & REGENERATE
            </button>
            <button className="sr-hitl-btn sr-hitl-reset" onClick={handleReinitialize}>
              <FileUp size={14} /> SUMMARIZE ANOTHER PDF
            </button>
          </div>
        </div>

        <div className="sr-layout-grid">
          {/* ── LEFT SIDEBAR ── */}
          <div className="sr-sidebar">
            
            <div className="sr-sidebar-top">
              <div className="sr-tabs">
                <div className="sr-tab sr-tab-active">LAWYER</div>
                <div className="sr-tab">STUDENT</div>
              </div>
              <div className="sr-risk-badge">● MODERATE RISK</div>
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
                  <span>65%</span>
                </div>
                <div className="sr-arg-track"><div className="sr-arg-fill" style={{width: '65%', background: '#ff2a2a'}} /></div>
              </div>
              <div className="sr-arg-row" style={{marginTop: '15px'}}>
                <div className="sr-arg-labels">
                  <span>RESPONDENT</span>
                  <span>40%</span>
                </div>
                <div className="sr-arg-track"><div className="sr-arg-fill" style={{width: '40%', background: '#555'}} /></div>
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
                  <span>🏛 {summaryData.jurisdiction || 'DELHI HIGH COURT'}</span>
                  <span>📅 {summaryData.filing || '12-OCT-2021'}</span>
                  <span style={{color: '#ff2a2a'}}>⏱ {summaryData.pendingDuration || '3Y PENDING'}</span>
                </div>
              </div>
              <div className="sr-header-actions">
                <button className="sr-action-btn" onClick={handleDownload}>
                  PDF EXPORT <Download size={14} style={{marginLeft: '8px', color: '#ff2a2a'}}/>
                </button>
                <button className="sr-action-btn" onClick={() => handleFeatureNotReady('SHARE_PROTOCOL')}>
                  TEAM SHARE <div className="sr-share-icon" />
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
                    <div className="sr-outcome-title">FAVORABLE JUDGMENT</div>
                    <div className="sr-outcome-sub">PROBABILITY: HIGH (84%)</div>
                  </div>
                </div>
                <p className="sr-outcome-desc">
                  AI synthesis of similar cyber-trespass precedents in {summaryData.jurisdiction || 'Delhi High Court'} suggests that interpretation favored the prosecution in 8 of the last 10 similar filings. <span className="sr-highlight">Key Insight: Precedent Applicability</span>
                </p>
                <div className="sr-outcome-bg-decor" />
              </div>
            </div>

            {/* Row 2: Facts and Questions */}
            <div className="sr-row-2">
              <div className="sr-facts-card">
                <div className="sr-card-heading">
                  <CheckCircle2 size={14} color="#ff2a2a" style={{marginRight: '8px'}} /> KEY FACTS
                </div>
                <div className="sr-facts-list">
                  {(summaryData.facts || []).map((txt, i) => (
                    <div className="sr-fact-row" key={i}>
                      <span className="sr-fact-num">0{i + 1}</span>
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
                      <span className="sr-q-icon">{i % 2 === 0 ? '!' : '?'}</span>
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
"""

new_content = content[:start_idx] + new_complete_state + "\n" + content[end_idx:]

with open('src/components/Summarizer.jsx', 'w') as f:
    f.write(new_content)

print("Replaced successfully")
