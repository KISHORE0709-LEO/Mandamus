import React, { useState, useEffect } from 'react';
import { Shield, Zap, MoreHorizontal, ChevronLeft, ChevronRight, Clock, AlertTriangle, X, Download } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import { useNavigate } from 'react-router-dom';
import './Scheduler.css';

const ReadinessGauge = ({ value = 0, status = 'EVALUATING' }) => {
  const r = 70, cx = 90, cy = 90;
  const total = Math.PI * r;
  const fill = (value / 100) * total;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div className="sc-gauge-wrap">
      <svg viewBox="0 0 180 100" className="sc-gauge-svg">
        <path d={d} fill="none" stroke="#1a1a1a" strokeWidth="10" strokeLinecap="round" />
        <path d={d} fill="none" stroke={status === 'CRITICAL' ? '#e02020' : status === 'REVIEW' ? '#f5a623' : '#00ff00'} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${fill} ${total}`} />
      </svg>
      <div className="sc-gauge-center">
        <span className="sc-gauge-val">{value}%</span>
        <span className="sc-gauge-lbl" style={{ color: status === 'CRITICAL' ? '#e02020' : status === 'REVIEW' ? '#f5a623' : '#00ff00' }}>{status}</span>
      </div>
    </div>
  );
};

export default function Scheduler({ onTabChange }) {
  const { state, updateState } = useMandamus();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState({ score: 0, status: 'EVALUATING', missing: [], prereqs: [] });
  const [slots, setSlots] = useState([]);
  const [calData, setCalData] = useState({ month: '', year: '', days: [] });
  const [history, setHistory] = useState([]);

  const [showConflict, setShowConflict] = useState(false);
  const [conflictSlot, setConflictSlot] = useState(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingSlot, setConfirmingSlot] = useState(null);

  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjReason, setAdjReason] = useState('Counsel unavailable');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjDate, setAdjDate] = useState('');
  const [adjRuling, setAdjRuling] = useState(null);
  const [adjLoading, setAdjLoading] = useState(false);

  const caseName = state.summariser_output?.caseName || 'UNKNOWN CASE';
  const caseId = state.case_id || 'UNKNOWN ID';
  const pendingDuration = state.summariser_output?.pendingDuration || 'N/A';
  const isUndertrial = state.summariser_output?.isUndertrial || false;
  const isPriority = isUndertrial || (pendingDuration.includes('year') && parseInt(pendingDuration) >= 3);

  useEffect(() => {
    if (state.draft_status === 'approved') {
      fetchData();
    }
  }, [state.draft_status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p1 = fetch('http://localhost:8000/scheduler/readiness', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summariser_status: state.summariser_status || 'idle',
          selected_precedents: state.selected_precedents || [],
          draft_status: state.draft_status || 'idle'
        })
      });

      const p2 = state.scheduler_status !== 'scheduled' 
        ? fetch('http://localhost:8000/scheduler/slots', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              case_id: caseId,
              case_type: state.summariser_output?.caseType || 'General',
              pending_duration: pendingDuration,
              is_undertrial: isUndertrial
            })
          })
        : Promise.resolve({ json: () => [] });

      const p3 = fetch('http://localhost:8000/scheduler/calendar');
      const p4 = fetch(`http://localhost:8000/scheduler/adjournments?case_id=${caseId}`);

      const [rRes, sRes, cRes, hRes] = await Promise.all([p1, p2, p3, p4]);

      const [rData, sData, cData, hData] = await Promise.all([
        rRes.json(),
        sRes.json(),
        cRes.json(),
        hRes.json()
      ]);

      setReadiness({ score: rData.score, status: rData.status, missing: rData.missing_items, prereqs: rData.prerequisites_met });

      if (state.scheduler_status !== 'scheduled') {
        setSlots(sData);
        const cSlot = sData.find(s => s.has_conflict);
        if (cSlot) {
          setConflictSlot(cSlot);
          setShowConflict(true);
        }
      }

      setCalData({ month: cData.current_month, year: cData.year, days: cData.days });
      setHistory(hData);

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAltClick = (altDate) => {
    const newSlots = [...slots];
    const idx = newSlots.findIndex(s => s.slot_id === conflictSlot.slot_id);
    if (idx !== -1) {
      newSlots[idx].date = altDate.split(' · ')[0] || altDate;
      newSlots[idx].time = altDate.split(' · ')[1] || newSlots[idx].time;
      newSlots[idx].has_conflict = false;
      setSlots(newSlots);
    }
    setShowConflict(false);
  };

  const confirmHearing = async () => {
    try {
      await fetch('http://localhost:8000/scheduler/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, slot: confirmingSlot })
      });
      updateState({ scheduler_status: 'scheduled', scheduled_date: confirmingSlot.date });
      setShowConfirmModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjournment = async () => {
    setAdjLoading(true);
    try {
      const res = await fetch('http://localhost:8000/scheduler/adjournment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, reason: adjReason, notes: adjNotes, requested_date: adjDate })
      });
      const data = await res.json();
      setAdjRuling(data);
    } catch (err) {
      console.error(err);
    }
    setAdjLoading(false);
  };

  const exportLogs = () => {
    let content = `HEARING SCHEDULER LOGS: ${caseName} [${caseId}]\n`;
    content += `Pending: ${pendingDuration} | Priority: ${isUndertrial ? 'YES' : 'NO'}\n`;
    content += `Readiness Score: ${readiness.score}% (${readiness.status})\n\n`;
    
    content += `SUGGESTED SLOTS:\n`;
    slots.forEach(s => {
      content += `- ${s.date} at ${s.time} in ${s.courtroom}\n  Reason: ${s.reason}\n`;
    });
    
    if (state.scheduler_status === 'scheduled') {
      content += `\nCONFIRMED HEARING:\n${state.scheduled_date}\n`;
    }
    
    content += `\nADJOURNMENT HISTORY:\n`;
    history.forEach(h => {
      content += `- ${h.date}: ${h.title} (${h.status}) - ${h.description}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mandamus_scheduler_${caseId}.txt`;
    a.click();
  };

  if (state.draft_status !== 'approved') {
    return (
      <div className="sc-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', border: '1px solid #333', background: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ color: '#e02020', fontFamily: 'monospace', letterSpacing: '0.1em' }}>DRAFT NOT APPROVED</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Draft must be approved before scheduling a hearing.</p>
          <button onClick={() => onTabChange && onTabChange('draft')} style={{ background: '#e02020', color: '#fff', padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>GO TO DRAFT GENERATOR</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sc-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', color: '#e02020', fontFamily: 'monospace', letterSpacing: '0.1em' }}>NEURAL SCHEDULER INITIALIZING...</div>
      </div>
    );
  }

  return (
    <div className="sc-page">
      {isPriority && (
        <div style={{ background: '#e02020', color: '#fff', padding: '8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: '20px' }}>
          ⚠ UNDERTRIAL_PRIORITY DETECTED — Case pending {pendingDuration}. Supreme Court mandate requires expedited scheduling within 30 days.
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="sc-header">
        <div className="sc-header-left">
          <h1 className="sc-title">HEARING_SCHEDULER</h1>
          <div className="sc-case-ref">
            <span className="sc-ref-bar" />
            <span className="sc-ref-text">Ref: {caseName} [{caseId}] · Pending: {pendingDuration}</span>
          </div>
        </div>
        <div className="sc-header-right">
          <button className="sc-btn-ghost" onClick={exportLogs}><Download size={14} style={{ marginRight: '5px' }}/> EXPORT_LOGS</button>
          <button className="sc-btn-outline" onClick={() => setShowAdjModal(true)}>REQUEST_ADJOURNMENT</button>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="sc-grid">

        {/* ── LEFT: READINESS ── */}
        <div className="sc-panel">
          <div className="sc-panel-title"><Shield size={13} /> READINESS_SCORE</div>
          <ReadinessGauge value={readiness.score} status={readiness.status} />

          <div className="sc-divider" />

          <div className="sc-missing-label" style={{ color: readiness.missing.length > 0 ? '#e02020' : '#888' }}>MISSING_ITEMS</div>
          {readiness.missing.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#888' }}>All prerequisites met.</div>
          ) : (
            readiness.missing.map((m, i) => (
              <div className="sc-blocker" key={i}>
                <div className="sc-blocker-top">
                  <span className="sc-blocker-tag">BLOCKER_STATUS</span>
                  <span className="sc-blocker-bang">!</span>
                </div>
                <div className="sc-blocker-text">{m}</div>
              </div>
            ))
          )}

          <div className="sc-divider" />

          <div className="sc-prereq-label">PREREQUISITES_MET</div>
          <div className="sc-prereq-tags">
            {readiness.prereqs.map((p, i) => <span className="sc-prereq-tag" key={i}>{p}</span>)}
          </div>
        </div>

        {/* ── CENTER: RECOMMENDATIONS ── */}
        <div className="sc-center">
          <div className="sc-center-title"><Zap size={13} /> SYSTEM_RECOMMENDATIONS</div>
          <p className="sc-center-sub">AI analysis suggests the following slots based on judicial availability and opposing counsel schedules.</p>

          {state.scheduler_status === 'scheduled' ? (
            <div style={{ padding: '30px', background: 'rgba(0, 255, 0, 0.05)', border: '1px solid #00ff00', textAlign: 'center', marginTop: '20px' }}>
              <div style={{ color: '#00ff00', fontSize: '1.2rem', marginBottom: '10px', fontFamily: 'monospace' }}>HEARING CONFIRMED ✓</div>
              <div style={{ color: '#fff', marginBottom: '20px' }}>{state.scheduled_date}</div>
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '30px' }}>All parties notified via system</div>
              <button onClick={() => onTabChange && onTabChange('virtual')} style={{ background: '#00ff00', color: '#000', padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>Proceed to Virtual Hearing →</button>
            </div>
          ) : (
            <>
              {/* ── CONFLICT ALERT ── */}
              {showConflict && conflictSlot && (
                <div className="sc-conflict-box">
                  <div className="sc-conflict-header">
                    <div className="sc-conflict-title-wrap">
                      <AlertTriangle size={15} className="sc-conflict-icon" />
                      <span className="sc-conflict-title">SCHEDULING CONFLICT DETECTED</span>
                    </div>
                    <button className="sc-conflict-dismiss" onClick={() => setShowConflict(false)}>
                      <X size={15} />
                    </button>
                  </div>
                  <div className="sc-conflict-body">
                    <div className="sc-conflict-row">
                      <span className="sc-conflict-label">REQUESTED_SLOT:</span> 
                      <span className="sc-conflict-val">{conflictSlot.date} · {conflictSlot.time}</span>
                    </div>
                    <div className="sc-conflict-row">
                      <span className="sc-conflict-label">CONFLICT_REASON:</span> 
                      <span className="sc-conflict-val sc-conflict-reason-text">{conflictSlot.conflict_reason}</span>
                    </div>
                    
                    <div className="sc-conflict-alts-label">NEURAL_SUGGESTED_ALTERNATIVES:</div>
                    <div className="sc-conflict-alts">
                      {conflictSlot.alternative_slots?.map((alt, i) => (
                        <button className="sc-alt-btn" key={i} onClick={() => handleAltClick(alt)}>{alt} <ChevronRight size={13} /></button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="sc-slots">
                {slots.map((s, i) => (
                  <div key={i} className={`sc-slot ${i === 0 ? 'sc-slot-primary' : ''}`} style={{ opacity: s.has_conflict ? 0.5 : 1 }}>
                    <div className="sc-slot-priority">{s.slot_id}</div>
                    <div className="sc-slot-date">{s.date}</div>
                    <div className="sc-slot-time">{s.time} · {s.courtroom}</div>
                    
                    <div className="sc-slot-reason">
                      <span className="sc-reason-label">REASON:</span> {s.reason}
                    </div>

                    <div className="sc-slot-actions">
                      <button 
                        disabled={s.has_conflict}
                        className={`sc-confirm-btn ${i === 0 && !s.has_conflict ? 'sc-confirm-active' : ''}`}
                        onClick={() => {
                          setConfirmingSlot(s);
                          setShowConfirmModal(true);
                        }}
                      >
                        CONFIRM_SLOT
                      </button>
                      <button className="sc-more-btn"><MoreHorizontal size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: CALENDAR + HISTORY ── */}
        <div className="sc-right">

          <div className="sc-panel sc-cal-panel">
            <div className="sc-cal-header">
              <span className="sc-cal-title">{calData.month}</span>
              <div className="sc-cal-nav">
                <button className="sc-cal-btn"><ChevronLeft size={13} /></button>
                <button className="sc-cal-btn"><ChevronRight size={13} /></button>
              </div>
            </div>
            <div className="sc-cal-grid">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="sc-cal-day-hdr">{d}</div>)}
              {calData.days.map((row, ri) =>
                row.map((cell, ci) => {
                  // Check if cell matches a slot
                  let isSlot = false;
                  if (!cell.dim && cell.n) {
                    const cellDateStr = `${cell.n}`; // naive match for demo
                    isSlot = slots.some(s => s.date.includes(cellDateStr));
                  }
                  
                  return (
                  <div key={`${ri}-${ci}`}
                    className={`sc-cal-cell ${cell.dim ? 'sc-cal-dim' : ''} ${cell.today ? 'sc-cal-today' : ''} ${isSlot ? 'sc-cal-marked' : ''}`}>
                    {cell.n}
                  </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="sc-panel sc-hist-panel">
            <div className="sc-hist-title"><Clock size={13} /> ADJOURNMENT_HISTORY</div>
            {history.map((a, i) => (
              <div key={i} className="sc-hist-item">
                <div className="sc-hist-dot-col">
                  <div className={`sc-hist-dot ${a.status === 'GRANTED' ? 'sc-hist-dot-active' : ''}`} style={{ borderColor: a.status === 'DENIED' ? '#e02020' : '' }} />
                  {i < history.length - 1 && <div className="sc-hist-line" />}
                </div>
                <div className="sc-hist-content">
                  <div className="sc-hist-date">{a.date} <span style={{ color: a.status === 'GRANTED' ? '#00ff00' : '#e02020', fontSize: '0.65rem', marginLeft: '5px' }}>[{a.status}]</span></div>
                  <div className={`sc-hist-name ${a.status !== 'GRANTED' ? 'sc-hist-name-dim' : ''}`}>{a.title}</div>
                  <div className="sc-hist-desc">{a.description}</div>
                </div>
              </div>
            ))}
            {history.length === 0 && <div style={{ fontSize: '0.8rem', color: '#555', padding: '10px' }}>No prior adjournments logged.</div>}
          </div>

        </div>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirmModal && confirmingSlot && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #333', padding: '30px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', fontFamily: 'monospace' }}>CONFIRM HEARING</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>
              Confirm hearing for <strong style={{ color: '#fff' }}>{confirmingSlot.date}</strong> at <strong style={{ color: '#fff' }}>{confirmingSlot.time}</strong> in <strong style={{ color: '#fff' }}>{confirmingSlot.courtroom}</strong>?<br/><br/>
              All parties will be automatically notified.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmModal(false)} style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace' }}>CANCEL</button>
              <button onClick={confirmHearing} style={{ background: '#e02020', border: 'none', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace' }}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {/* ADJOURNMENT MODAL */}
      {showAdjModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #333', padding: '30px', width: '450px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontFamily: 'monospace' }}>REQUEST ADJOURNMENT</h3>
              <button onClick={() => { setShowAdjModal(false); setAdjRuling(null); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            
            {!adjRuling ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '5px', fontFamily: 'monospace' }}>REASON</label>
                  <select value={adjReason} onChange={e => setAdjReason(e.target.value)} style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: '#fff', outline: 'none' }}>
                    <option>Counsel unavailable</option>
                    <option>Evidence pending</option>
                    <option>Witness travel</option>
                    <option>Medical emergency</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '5px', fontFamily: 'monospace' }}>NOTES</label>
                  <textarea value={adjNotes} onChange={e => setAdjNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: '#fff', outline: 'none', resize: 'none' }} placeholder="Additional context..." />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '5px', fontFamily: 'monospace' }}>REQUESTED DATE</label>
                  <input type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: '#fff', outline: 'none', colorScheme: 'dark' }} />
                </div>
                <button onClick={handleAdjournment} disabled={adjLoading} style={{ background: '#e02020', border: 'none', color: '#fff', padding: '12px', cursor: 'pointer', fontFamily: 'monospace', marginTop: '10px' }}>
                  {adjLoading ? 'SUBMITTING...' : 'SUBMIT REQUEST'}
                </button>
              </div>
            ) : (
              <div style={{ background: adjRuling.approved ? 'rgba(0, 255, 0, 0.05)' : 'rgba(224, 32, 32, 0.05)', border: `1px solid ${adjRuling.approved ? '#00ff00' : '#e02020'}`, padding: '20px' }}>
                <h4 style={{ color: adjRuling.approved ? '#00ff00' : '#e02020', marginBottom: '15px', fontFamily: 'monospace' }}>
                  {adjRuling.approved ? 'ADJOURNMENT GRANTED' : 'ADJOURNMENT DENIED'}
                </h4>
                {adjRuling.approved ? (
                  <div style={{ color: '#fff', marginBottom: '15px', fontSize: '0.9rem' }}>New Suggested Date: {adjRuling.new_suggested_date}</div>
                ) : (
                  <div style={{ color: '#e02020', marginBottom: '15px', fontSize: '0.9rem' }}>Reason: {adjRuling.rejection_reason}</div>
                )}
                <div style={{ background: '#000', padding: '10px', borderLeft: `3px solid ${adjRuling.approved ? '#00ff00' : '#e02020'}`, color: '#888', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{adjRuling.formal_order_text}"
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
