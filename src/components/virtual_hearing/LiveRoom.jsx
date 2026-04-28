import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, FileText, Shield, Disc } from 'lucide-react';

const PARTICIPANTS = [
  { id: 'p1', name: 'Hon. Justice R. Vance', role: 'Judge',   isJudge: true,  status: 'verified', initials: 'JV' },
  { id: 'p2', name: 'Adv. Priya Nair',       role: 'Lawyer',  isJudge: false, status: 'verified', initials: 'PN' },
  { id: 'p3', name: 'Adv. S. Chatterjee',    role: 'Lawyer',  isJudge: false, status: 'verified', initials: 'SC' },
  { id: 'p4', name: 'Arjun Mehta',           role: 'Accused', isJudge: false, status: 'verified', initials: 'AM' },
];

const MOCK_TRANSCRIPT = [
  { speaker: 'System', text: 'End-to-end encrypted session initiated. All participants verified.', system: true },
  { speaker: 'Hon. Justice R. Vance', text: 'This court is now in session. Counsel, you may proceed with opening statements.' },
  { speaker: 'Adv. Priya Nair', text: 'Thank you, Your Honour. The petitioner contends that the accused misappropriated funds under IPC §406…' },
];

const LiveRoom = ({ role, caseData, setStage }) => {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const [transcript, setTranscript] = useState(MOCK_TRANSCRIPT);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    if (!recording) return;
    const lines = [
      { speaker: 'Hon. Justice R. Vance', text: 'Counsel, please present the digital evidence referenced in Exhibit A.' },
      { speaker: 'Adv. S. Chatterjee', text: 'Objection, Your Honour — the evidence was obtained without a valid warrant under the IT Act.' },
      { speaker: 'Hon. Justice R. Vance', text: 'Objection noted. We will address admissibility after a short recess.' },
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < lines.length) { setTranscript(p => [...p, lines[i]]); i++; }
      else clearInterval(iv);
    }, 4000);
    return () => clearInterval(iv);
  }, [recording]);

  return (
    <div className="live-room">
      {/* End session confirmation */}
      {showEndConfirm && (
        <div className="vh-confirm-overlay">
          <div className="vh-confirm-box">
            <h3>End Session?</h3>
            <p>This will close the hearing for all participants. This action cannot be undone.</p>
            <div className="vh-confirm-actions">
              <button className="vh-btn-danger" onClick={() => setStage('post-hearing')}>Yes, End Session</button>
              <button className="vh-btn-secondary" onClick={() => setShowEndConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="live-header">
        <div className="meeting-info">
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{caseData?.id}: {caseData?.name}</span>
          <div className="security-badge"><Shield size={14} /> E2EE</div>
        </div>
        {recording && (
          <div className="rec-indicator"><div className="rec-dot" /> REC</div>
        )}
      </div>

      <div className="main-stage">
        <div className={`video-grid ${PARTICIPANTS.length > 2 ? 'judge-focused' : ''}`}>
          {PARTICIPANTS.map(p => (
            <div key={p.id} className={`video-tile ${p.isJudge ? 'judge-tile' : ''}`}>
              <div className="video-avatar" style={{ fontSize: '1.8rem' }}>{p.initials}</div>
              <div className="name-tag">
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span className="role-tag">{p.role}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="side-panel">
          <div className="panel-header">
            <button onClick={() => setActiveTab('transcript')} className={`vh-tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}>
              <MessageSquare size={14} /> Transcript
            </button>
            <button onClick={() => setActiveTab('docs')} className={`vh-tab-btn ${activeTab === 'docs' ? 'active' : ''}`}>
              <FileText size={14} /> Evidence
            </button>
          </div>
          <div className="panel-content">
            {activeTab === 'transcript' ? (
              <>
                {transcript.map((msg, i) => (
                  <div key={i} className="transcript-msg" style={{ opacity: msg.system ? 0.6 : 1 }}>
                    <div className="transcript-speaker">{msg.speaker}</div>
                    <div className="transcript-text" style={{ fontStyle: msg.system ? 'italic' : 'normal' }}>{msg.text}</div>
                  </div>
                ))}
                {recording && <div className="vh-transcribing">● Transcribing…</div>}
                <div ref={transcriptEndRef} />
              </>
            ) : (
              <div>
                {['Case_Summary.pdf', 'Bank_Statements.pdf', 'Digital_Forensics_Report.pdf'].map((d, i) => (
                  <div key={i} className="doc-item">
                    <FileText size={20} color="#666" />
                    <div className="doc-info"><h4>{d}</h4><span>EXHIBIT {String.fromCharCode(65 + i)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <div className="meeting-code">{caseData?.room} — {caseData?.id}</div>
        <div className="controls">
          <button className="control-btn" onClick={() => setMicOn(!micOn)} style={{ background: !micOn ? '#ea4335' : '#1a1a1a' }}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button className="control-btn" onClick={() => setCameraOn(!cameraOn)} style={{ background: !cameraOn ? '#ea4335' : '#1a1a1a' }}>
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          {role === 'judge' && (
            <button className="control-btn" onClick={() => setRecording(!recording)} style={{ background: recording ? '#ea4335' : '#1a1a1a' }} title="Toggle Recording">
              <Disc size={20} />
            </button>
          )}
          <button className="control-btn danger leave" onClick={() => setShowEndConfirm(true)}>
            <PhoneOff size={20} /> END SESSION
          </button>
        </div>
        <div style={{ width: '120px' }} />
      </div>
    </div>
  );
};

export default LiveRoom;
