import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, FileText, Settings, Info,
  MoreVertical, ShieldAlert, Disc, Shield
} from 'lucide-react';

const LiveRoom = ({ setStage, role }) => {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' or 'docs'
  const [transcript, setTranscript] = useState([
    { speaker: 'System', text: 'End-to-end encryption established. Cryptographic session initiated.', type: 'system' }
  ]);
  
  const transcriptEndRef = useRef(null);

  // Mock participants
  const participants = [
    { id: 'p1', name: 'Judge Vance', role: 'Presiding', isJudge: true, avatar: '/avatars/judge.png', status: 'verified' },
    { id: 'p2', name: 'Atty. Thorne', role: 'Petitioner', avatar: '/avatars/petitioner.png', status: 'verified' },
    { id: 'p3', name: 'Atty. Jenkins', role: 'Respondent', avatar: '/avatars/respondent.png', status: 'pending' }
  ];

  const documents = [
    { id: 'd1', name: 'Case_Summary_OB821.pdf', type: 'PRIMARY DOC' },
    { id: 'd2', name: 'Smart_Contract_Audit.json', type: 'EXHIBIT A' },
    { id: 'd3', name: 'Wallet_Logs_Final.csv', type: 'EXHIBIT B' }
  ];

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Simulate live transcript if recording
  useEffect(() => {
    if (!recording) return;

    const mockSpeeches = [
      { speaker: 'Judge Vance', text: 'Counsel, you may proceed with the opening statements regarding the cryptographic asset seizure.' },
      { speaker: 'Atty. Thorne', text: 'Thank you, Your Honor. The petitioner contends that the private keys were obtained without a valid digital warrant under Section 8.4...' },
      { speaker: 'Judge Vance', text: 'Wait. Counselor Jenkins, do you have the rebuttal documentation for the warrant timestamp?' }
    ];

    let count = 0;
    const interval = setInterval(() => {
      if (count < mockSpeeches.length) {
        setTranscript(prev => [...prev, mockSpeeches[count]]);
        count++;
      } else {
        clearInterval(interval);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [recording]);

  const handleEndCall = () => {
    setStage('post-hearing');
  };

  return (
    <div className="live-room">
      <div className="live-header">
        <div className="meeting-info">
          <span style={{ fontWeight: 500, fontSize: '1.2rem' }}>Case #8B21-ALPHA: State vs. Nexus DAO</span>
          <div className="security-badge">
            <Shield size={14} />
            E2EE
          </div>
        </div>
        
        {recording && (
          <div className="rec-indicator">
            <div className="rec-dot"></div>
            REC
          </div>
        )}
      </div>

      <div className="main-stage">
        <div className={`video-grid ${participants.length > 2 ? 'judge-focused' : ''}`}>
          {participants.map(p => (
            <div key={p.id} className={`video-tile ${p.isJudge ? 'judge-tile' : ''}`}>
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="video-avatar">
                  {p.name.charAt(0)}
                </div>
              )}
              <div className="name-tag" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                <div style={{ fontWeight: 500, fontSize: '1rem' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="role-tag" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>{p.role}</span>
                  {p.status === 'verified' ? (
                    <span style={{ fontSize: '0.6rem', color: '#81c995', border: '1px solid #81c995', padding: '0.1rem 0.3rem', borderRadius: '2px', textTransform: 'uppercase' }}>Verified</span>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: '#fcc934', border: '1px solid #fcc934', padding: '0.1rem 0.3rem', borderRadius: '2px', textTransform: 'uppercase' }}>Pending</span>
                  )}
                </div>
              </div>
              {/* Overlay for continuous auth simulation */}
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '0.3rem', borderRadius: '50%', display: 'flex' }}>
                  <Mic size={16} color="white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="side-panel">
          <div className="panel-header">
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setActiveTab('transcript')}
                style={{ 
                  background: 'none', border: 'none', 
                  fontWeight: activeTab === 'transcript' ? 600 : 400,
                  color: activeTab === 'transcript' ? 'var(--primary-red)' : '#5f6368',
                  cursor: 'pointer', borderBottom: activeTab === 'transcript' ? '2px solid var(--primary-red)' : 'none',
                  paddingBottom: '0.5rem'
                }}
              >
                Live Transcript
              </button>
              <button 
                onClick={() => setActiveTab('docs')}
                style={{ 
                  background: 'none', border: 'none', 
                  fontWeight: activeTab === 'docs' ? 600 : 400,
                  color: activeTab === 'docs' ? 'var(--primary-red)' : '#5f6368',
                  cursor: 'pointer', borderBottom: activeTab === 'docs' ? '2px solid var(--primary-red)' : 'none',
                  paddingBottom: '0.5rem'
                }}
              >
                Evidence
              </button>
            </div>
          </div>
          
          <div className="panel-content">
            {activeTab === 'transcript' ? (
              <>
                {transcript.map((msg, idx) => (
                  <div key={idx} className="transcript-msg" style={{ opacity: msg.type === 'system' ? 0.7 : 1 }}>
                    <div className="transcript-speaker" style={{ color: msg.speaker === 'Judge Vance' ? '#d93025' : 'var(--primary-red)' }}>
                      {msg.speaker} <span style={{ fontSize: '0.7rem', color: '#9aa0a6', fontWeight: 'normal' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="transcript-text" style={{ fontStyle: msg.type === 'system' ? 'italic' : 'normal' }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {recording && (
                  <div style={{ fontSize: '0.8rem', color: '#5f6368', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <div className="rec-dot" style={{ width: '6px', height: '6px' }}></div> Transcribing...
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </>
            ) : (
              <div>
                {documents.map(doc => (
                  <div key={doc.id} className="doc-item">
                    <FileText size={24} color="#5f6368" />
                    <div className="doc-info">
                      <h4>{doc.name}</h4>
                      <span>{doc.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <div className="meeting-code">
          8B21-ALPHA-Z9X
        </div>

        <div className="controls">
          <button className="control-btn" onClick={() => setMicOn(!micOn)} style={{ backgroundColor: !micOn ? '#ea4335' : '#3c4043' }}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button className="control-btn" onClick={() => setCameraOn(!cameraOn)} style={{ backgroundColor: !cameraOn ? '#ea4335' : '#3c4043' }}>
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          
          {role === 'judge' && (
            <button className="control-btn" onClick={() => setRecording(!recording)} title={recording ? "Stop Recording" : "Start Recording"} style={{ backgroundColor: recording ? '#ea4335' : '#3c4043' }}>
              <Disc size={20} />
            </button>
          )}

          <button className="control-btn danger leave" onClick={handleEndCall}>
            <PhoneOff size={20} />
          </button>
        </div>

        <div className="side-controls">
          <button className="control-btn" style={{ width: '40px', height: '40px' }} onClick={() => setActiveTab('transcript')}>
            <MessageSquare size={18} />
          </button>
          <button className="control-btn" style={{ width: '40px', height: '40px' }}>
            <Info size={18} />
          </button>
          <button className="control-btn" style={{ width: '40px', height: '40px' }}>
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveRoom;
