import React, { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Plus, CheckCircle2, ChevronRight, Download, Trash2, Paperclip } from 'lucide-react';
import { useMandamus } from '../context/MandamusContext';
import './Scheduler.css';

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

function buildAgenda(state) {
  const summary = state.summariser_output;
  const draft = state.draft_output;
  if (!summary && !draft) return '';
  const lines = [];
  if (summary?.caseName) lines.push(`Case: ${summary.caseName}`);
  if (summary?.petitioner && summary?.respondent)
    lines.push(`Parties: ${summary.petitioner} vs ${summary.respondent}`);
  if (draft?.sections?.length)
    lines.push(`Draft covers: ${draft.sections.map(s => s.title).join(', ')}`);
  if (summary?.legalQuestions?.length)
    lines.push(`Key question: ${summary.legalQuestions[0]}`);
  return lines.join('\n');
}

export default function Scheduler({ onTabChange }) {
  const { state, updateState } = useMandamus();
  const summary = state.summariser_output || {};
  const hasDraft = state.draft_status === 'approved' || !!state.draft_output;

  const [meetings, setMeetings] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sc_meetings') || '[]'); }
    catch { return []; }
  });

  const [form, setForm] = useState({
    title: summary.caseName ? `Hearing — ${summary.caseName}` : '',
    date: todayStr,
    time: '10:00',
    type: 'Virtual Hearing',
    agenda: buildAgenda(state),
    attachDraft: hasDraft,
    parties: summary.petitioner && summary.respondent
      ? `${summary.petitioner} · ${summary.respondent}` : '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // Re-fill form when case data arrives
  useEffect(() => {
    setForm(f => ({
      ...f,
      title: f.title || (summary.caseName ? `Hearing — ${summary.caseName}` : ''),
      agenda: f.agenda || buildAgenda(state),
      parties: f.parties || (summary.petitioner && summary.respondent
        ? `${summary.petitioner} · ${summary.respondent}` : ''),
      attachDraft: hasDraft,
    }));
  }, [state.summariser_output, state.draft_output]);

  useEffect(() => {
    sessionStorage.setItem('sc_meetings', JSON.stringify(meetings));
  }, [meetings]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title required';
    if (!form.date) e.date = 'Date required';
    if (!form.time) e.time = 'Time required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSchedule = () => {
    if (!validate()) return;
    const meeting = {
      id: Date.now(),
      ...form,
      caseId: state.case_id || summary.caseId || '—',
      createdAt: new Date().toISOString(),
      draftAttached: form.attachDraft && hasDraft,
    };
    const updated = [meeting, ...meetings];
    setMeetings(updated);
    updateState({ scheduler_status: 'scheduled', scheduled_date: `${form.date} ${form.time}` });
    setSubmitted(true);
  };

  const handleDelete = (id) => {
    setMeetings(m => m.filter(x => x.id !== id));
  };

  const handleExport = (m) => {
    const txt = [
      `SCHEDULED MEETING`,
      `─────────────────────────────────`,
      `Title    : ${m.title}`,
      `Date     : ${m.date} at ${m.time}`,
      `Type     : ${m.type}`,
      `Case ID  : ${m.caseId}`,
      `Parties  : ${m.parties || '—'}`,
      ``,
      `AGENDA`,
      `─────────────────────────────────`,
      m.agenda || '(none)',
      ``,
      m.draftAttached ? `[Draft attached]` : '',
    ].join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `meeting_${m.id}.txt`;
    a.click();
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm(f => ({ ...f, date: todayStr, time: '10:00' }));
  };

  return (
    <div className="sc-page">

      {/* ── HEADER ── */}
      <div className="sc-header">
        <div>
          <h1 className="sc-title">HEARING_SCHEDULER</h1>
          <p className="sc-sub">SCHEDULE · MANAGE · PROCEED TO VIRTUAL HEARING</p>
        </div>
        {summary.caseName && (
          <div className="sc-case-chip">
            <span className="sc-chip-bar" />
            <span className="sc-chip-txt">{summary.caseName}</span>
          </div>
        )}
      </div>

      <div className="sc-layout">

        {/* ── LEFT: FORM ── */}
        <div className="sc-form-col">
          <div className="sc-section-label"><Plus size={12} /> NEW MEETING</div>

          {submitted ? (
            <div className="sc-success">
              <CheckCircle2 size={32} className="sc-success-icon" />
              <div className="sc-success-title">MEETING SCHEDULED</div>
              <div className="sc-success-sub">{form.date} at {form.time}</div>
              <div className="sc-success-actions">
                <button className="sc-btn-outline" onClick={resetForm}>SCHEDULE ANOTHER</button>
                <button className="sc-btn-primary" onClick={() => onTabChange && onTabChange('virtual')}>
                  PROCEED TO VIRTUAL HEARING <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="sc-form">

              <div className="sc-field">
                <label className="sc-label">MEETING TITLE</label>
                <input
                  className={`sc-input ${errors.title ? 'sc-input-err' : ''}`}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Hearing — State vs Malhotra"
                />
                {errors.title && <span className="sc-err">{errors.title}</span>}
              </div>

              <div className="sc-row-2">
                <div className="sc-field">
                  <label className="sc-label"><Calendar size={11} /> DATE</label>
                  <input
                    type="date"
                    className={`sc-input sc-input-date ${errors.date ? 'sc-input-err' : ''}`}
                    value={form.date}
                    min={todayStr}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                  {errors.date && <span className="sc-err">{errors.date}</span>}
                </div>
                <div className="sc-field">
                  <label className="sc-label"><Clock size={11} /> TIME</label>
                  <input
                    type="time"
                    className={`sc-input sc-input-date ${errors.time ? 'sc-input-err' : ''}`}
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  />
                  {errors.time && <span className="sc-err">{errors.time}</span>}
                </div>
              </div>

              <div className="sc-field">
                <label className="sc-label">MEETING TYPE</label>
                <select
                  className="sc-input sc-select"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  <option>Virtual Hearing</option>
                  <option>In-Person Hearing</option>
                  <option>Chambers Meeting</option>
                  <option>Pre-Trial Conference</option>
                  <option>Mediation Session</option>
                </select>
              </div>

              <div className="sc-field">
                <label className="sc-label">PARTIES</label>
                <input
                  className="sc-input"
                  value={form.parties}
                  onChange={e => setForm(f => ({ ...f, parties: e.target.value }))}
                  placeholder="Petitioner · Respondent"
                />
              </div>

              <div className="sc-field">
                <label className="sc-label">AGENDA</label>
                <textarea
                  className="sc-input sc-textarea"
                  value={form.agenda}
                  onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                  placeholder="Auto-generated from case context…"
                  rows={5}
                />
              </div>

              {hasDraft && (
                <label className="sc-attach-row">
                  <input
                    type="checkbox"
                    checked={form.attachDraft}
                    onChange={e => setForm(f => ({ ...f, attachDraft: e.target.checked }))}
                    className="sc-checkbox"
                  />
                  <Paperclip size={12} />
                  <span>Attach generated draft to this meeting</span>
                </label>
              )}

              <button className="sc-btn-primary sc-submit" onClick={handleSchedule}>
                <Calendar size={15} /> SCHEDULE MEETING
              </button>

            </div>
          )}
        </div>

        {/* ── RIGHT: MEETINGS LIST ── */}
        <div className="sc-list-col">
          <div className="sc-section-label"><FileText size={12} /> SCHEDULED MEETINGS ({meetings.length})</div>

          {meetings.length === 0 ? (
            <div className="sc-empty">
              <Calendar size={28} className="sc-empty-icon" />
              <div className="sc-empty-txt">No meetings scheduled yet.</div>
              <div className="sc-empty-sub">Fill the form and click Schedule Meeting.</div>
            </div>
          ) : (
            <div className="sc-meetings">
              {meetings.map((m) => (
                <div key={m.id} className="sc-meeting-card">
                  <div className="sc-meeting-top">
                    <div className="sc-meeting-type-tag">{m.type}</div>
                    <div className="sc-meeting-actions">
                      <button className="sc-icon-btn" onClick={() => handleExport(m)} title="Export"><Download size={13} /></button>
                      <button className="sc-icon-btn sc-icon-del" onClick={() => handleDelete(m.id)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="sc-meeting-title">{m.title}</div>
                  <div className="sc-meeting-meta">
                    <span><Calendar size={11} /> {m.date}</span>
                    <span className="sc-meta-sep">·</span>
                    <span><Clock size={11} /> {m.time}</span>
                    {m.caseId !== '—' && <><span className="sc-meta-sep">·</span><span>ID: {m.caseId}</span></>}
                  </div>
                  {m.parties && <div className="sc-meeting-parties">{m.parties}</div>}
                  {m.agenda && (
                    <div className="sc-meeting-agenda">
                      {m.agenda.split('\n').map((line, i) => line && <div key={i} className="sc-agenda-line">{line}</div>)}
                    </div>
                  )}
                  {m.draftAttached && (
                    <div className="sc-draft-badge"><Paperclip size={11} /> Draft attached</div>
                  )}
                  <button
                    className="sc-join-btn"
                    onClick={() => onTabChange && onTabChange('virtual')}
                  >
                    JOIN VIRTUAL HEARING <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* workflow hint if no draft yet */}
          {!hasDraft && (
            <div className="sc-workflow-hint">
              <div className="sc-hint-step sc-hint-done">① SUMMARISE</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step sc-hint-done">② PRECEDENTS</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step sc-hint-done">③ DRAFT</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step sc-hint-active">④ SCHEDULE</div>
              <div className="sc-hint-arrow">→</div>
              <div className="sc-hint-step">⑤ HEARING</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
