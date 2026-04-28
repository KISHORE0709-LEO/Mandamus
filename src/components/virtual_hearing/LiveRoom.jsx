import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, FileText, Shield, Disc, Users, Download
} from 'lucide-react';

const PARTICIPANTS = [
  { id: 'p1', name: 'Hon. Justice R. Vance', role: 'Judge',   isJudge: true,  initials: 'JV', color: '#e02020' },
  { id: 'p2', name: 'Adv. Priya Nair',       role: 'Lawyer',  isJudge: false, initials: 'PN', color: '#4285f4' },
  { id: 'p3', name: 'Adv. S. Chatterjee',    role: 'Lawyer',  isJudge: false, initials: 'SC', color: '#34a853' },
  { id: 'p4', name: 'Arjun Mehta',           role: 'Accused', isJudge: false, initials: 'AM', color: '#fbbc04' },
];

const DOCS = [
  { name: 'Case_Summary_MH-HC-2024-4471.pdf', tag: 'PRIMARY DOC' },
  { name: 'Bank_Statements_Jan_Aug_2021.pdf',  tag: 'EXHIBIT A'   },
  { name: 'Digital_Forensics_Report.pdf',      tag: 'EXHIBIT B'   },
  { name: 'Witness_Depositions.pdf',           tag: 'EXHIBIT C'   },
];

const MOCK_TRANSCRIPT = [
  { speaker: 'System',               text: 'End-to-end encrypted session initiated. All participants verified.', system: true },
  { speaker: 'Hon. Justice R. Vance', text: 'This court is now in session. Counsel, you may proceed with opening statements.' },
  { speaker: 'Adv. Priya Nair',       text: 'Thank you, Your Honour. The petitioner contends that the accused misappropriated ₹4.2 Cr under IPC §406…' },
];

const LIVE_LINES = [
  { speaker: 'Hon. Justice R. Vance',  text: 'Counsel, please present the digital evidence referenced in Exhibit B.' },
  { speaker: 'Adv. S. Chatterjee',     text: 'Objection, Your Honour — the evidence was obtained without a valid warrant under the IT Act §65.' },
  { speaker: 'Hon. Justice R. Vance',  text: 'Objection noted. We will address admissibility after a short recess.' },
  { speaker: 'Adv. Priya Nair',        text: 'Your Honour, the forensic logs clearly show 47 falsified transactions originating from the accused\'s device.' },
];

const LiveRoom = ({ role, caseData, setStage }) => {
  const [micOn,          setMicOn]          = useState(true);
  const [cameraOn,       setCameraOn]       = useState(true);
  const [recording,      setRecording]      = useState(false);
  const [activeTab,      setActiveTab]      = useState('transcript');
  const [panelOpen,      setPanelOpen]      = useState(true);
  const [transcript,     setTranscript]     = useState(MOCK_TRANSCRIPT);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [speaking,       setSpeaking]       = useState('p1');
  const transcriptEndRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Simulate live transcript when recording
  useEffect(() => {
    if (!recording) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i < LIVE_LINES.length) {
        setTranscript(p => [...p, LIVE_LINES[i]]);
        setSpeaking(['p1','p3','p1','p2'][i] || 'p1');
        i++;
      } else clearInterval(iv);
    }, 4000);
    return () => clearInterval(iv);
  }, [recording]);

  const judge     = PARTICIPANTS.find(p => p.isJudge);
  const others    = PARTICIPANTS.filter(p => !p.isJudge);

  return (
    <div className="lr-root">

      {/* ── END SESSION CONFIRM ── */}
      {showEndConfirm && (
        <div className="vh-confirm-overlay">
          <div className="vh-confirm-box">
            <h3>End Session?</h3>
            <p>This will close the hearing for all participants and seal the session record. This cannot be undone.</p>
            <div className="vh-confirm-actions">
              <button className="vh-btn-danger" onClick={() => setStage('post-hearing')}>Yes, End Session</button>
              <button className="vh-btn-secondary" onClick={() => setShowEndConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="lr-topbar">
        <div className="lr-topbar-left">
          <div className="lr-case-id">{caseData?.id}</div>
          <div className="lr-case-name">{caseData?.name}</div>
        </div>
        <div className="lr-topbar-center">
          {recording && (
            <div className="lr-rec-pill"><span className="lr-rec-dot" /> REC · LIVE</div>
          )}
        </div>
        <div className="lr-topbar-right">
          <div className="lr-e2ee"><Shield size={13} /> E2EE</div>
          <div className="lr-time" id="lr-clock">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="lr-body">

        {/* ── VIDEO AREA ── */}
        <div className="lr-video-area">

          {/* Judge — large spotlight tile */}
          <div className={`lr-spotlight ${speaking === judge.id ? 'lr-speaking' : ''}`}>
            <div className="lr-avatar-wrap">
              <div className="lr-avatar" style={{ background: judge.color }}>{judge.initials}</div>
            </div>
            <div className="lr-nametag">
              <span className="lr-nametag-name">{judge.name}</span>
              <span className="lr-nametag-role">{judge.role}</span>
              <span className="lr-nametag-verified">✓ Verified</span>
            </div>
            <div className="lr-mic-indicator">
              <Mic size={12} />
            </div>
          </div>

          {/* Others — strip of equal tiles */}
          <div className="lr-strip">
            {others.map(p => (
              <div key={p.id} className={`lr-tile ${speaking === p.id ? 'lr-speaking' : ''}`}>
                <div className="lr-avatar lr-avatar-sm" style={{ background: p.color }}>{p.initials}</div>
                <div className="lr-nametag lr-nametag-sm">
                  <span className="lr-nametag-name">{p.name}</span>
                  <span className="lr-nametag-role">{p.role}</span>
                </div>
                <div className="lr-mic-indicator"><Mic size={11} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SIDE PANEL ── */}
        {panelOpen && (
          <div className="lr-side">
            <div className="lr-side-tabs">
              <button
                className={`lr-side-tab ${activeTab === 'transcript' ? 'active' : ''}`}
                onClick={() => setActiveTab('transcript')}
              >
                <MessageSquare size={14} /> Transcript
              </button>
              <button
                className={`lr-side-tab ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
              >
                <FileText size={14} /> Documents
              </button>
              <button
                className={`lr-side-tab ${activeTab === 'people' ? 'active' : ''}`}
                onClick={() => setActiveTab('people')}
              >
                <Users size={14} /> People
              </button>
            </div>

            <div className="lr-side-body">
              {/* TRANSCRIPT */}
              {activeTab === 'transcript' && (
                <>
                  {transcript.map((msg, i) => (
                    <div key={i} className={`lr-msg ${msg.system ? 'lr-msg-system' : ''}`}>
                      {!msg.system && <div className="lr-msg-speaker">{msg.speaker}</div>}
                      <div className="lr-msg-text">{msg.text}</div>
                    </div>
                  ))}
                  {recording && (
                    <div className="lr-transcribing">
                      <span className="lr-rec-dot" style={{ width: 6, height: 6 }} /> Transcribing live…
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </>
              )}

              {/* DOCUMENTS */}
              {activeTab === 'docs' && (
                <div className="lr-docs-list">
                  {DOCS.map((d, i) => (
                    <div key={i} className="lr-doc-row">
                      <div className="lr-doc-icon"><FileText size={18} /></div>
                      <div className="lr-doc-info">
                        <div className="lr-doc-name">{d.name}</div>
                        <div className="lr-doc-tag">{d.tag}</div>
                      </div>
                      <button className="lr-doc-dl" title="Download"><Download size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* PEOPLE */}
              {activeTab === 'people' && (
                <div className="lr-people-list">
                  {PARTICIPANTS.map(p => (
                    <div key={p.id} className="lr-person-row">
                      <div className="lr-avatar lr-avatar-xs" style={{ background: p.color }}>{p.initials}</div>
                      <div className="lr-person-info">
                        <div className="lr-person-name">{p.name}</div>
                        <div className="lr-person-role">{p.role}</div>
                      </div>
                      <span className="lr-person-verified">✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="lr-bottombar">
        {/* Left — room info */}
        <div className="lr-bottom-left">
          <span className="lr-room-code">{caseData?.room}</span>
          <span className="lr-room-sep">·</span>
          <span className="lr-room-code">{PARTICIPANTS.length} participants</span>
        </div>

        {/* Center — main controls */}
        <div className="lr-controls">
          <div className="lr-ctrl-group">
            <button
              className={`lr-ctrl-btn ${!micOn ? 'lr-ctrl-off' : ''}`}
              onClick={() => setMicOn(!micOn)}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <span className="lr-ctrl-label">{micOn ? 'Mute' : 'Unmute'}</span>
          </div>

          <div className="lr-ctrl-group">
            <button
              className={`lr-ctrl-btn ${!cameraOn ? 'lr-ctrl-off' : ''}`}
              onClick={() => setCameraOn(!cameraOn)}
              title={cameraOn ? 'Stop Video' : 'Start Video'}
            >
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <span className="lr-ctrl-label">{cameraOn ? 'Camera' : 'No Video'}</span>
          </div>

          {role === 'judge' && (
            <div className="lr-ctrl-group">
              <button
                className={`lr-ctrl-btn ${recording ? 'lr-ctrl-rec' : ''}`}
                onClick={() => setRecording(!recording)}
                title={recording ? 'Stop Recording' : 'Start Recording'}
              >
                <Disc size={20} />
              </button>
              <span className="lr-ctrl-label">{recording ? 'Stop Rec' : 'Record'}</span>
            </div>
          )}

          <div className="lr-ctrl-group">
            <button
              className="lr-ctrl-btn lr-ctrl-end"
              onClick={() => setShowEndConfirm(true)}
              title="End Session"
            >
              <PhoneOff size={20} />
            </button>
            <span className="lr-ctrl-label">End</span>
          </div>
        </div>

        {/* Right — panel toggle */}
        <div className="lr-bottom-right">
          <button
            className={`lr-panel-toggle ${panelOpen ? 'active' : ''}`}
            onClick={() => setPanelOpen(!panelOpen)}
            title="Toggle Panel"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveRoom;
