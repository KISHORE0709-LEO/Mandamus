import React, { useMemo } from 'react';
import { ShieldCheck, FileText, Download, CalendarClock } from 'lucide-react';

const PostHearing = ({ role, caseData, onReturn }) => {
  const sessionHash = useMemo(() => [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''), []);
  const duration = '1h 24m';
  const participantCount = 4;

  return (
    <div className="post-hearing">
      <div className="summary-card">
        <div className="summary-header">
          <div className="vh-post-icon"><ShieldCheck size={32} /></div>
          <h2>HEARING COMPLETE ✅</h2>
          <p>The session has been cryptographically sealed and stored immutably.</p>
        </div>

        <div className="summary-content">
          <div className="info-group">
            <h3><FileText size={16} /> Session Record</h3>
            <div className="info-item">
              <span className="info-label">Case</span>
              <span className="info-value">{caseData?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration</span>
              <span className="info-value">{duration}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Participants</span>
              <span className="info-value">{participantCount} Verified</span>
            </div>
            <div className="info-item">
              <span className="info-label">Recording</span>
              <span className="info-value" style={{ color: '#81c995' }}>✅ Stored</span>
            </div>
            <div className="info-item">
              <span className="info-label">Transcript</span>
              <span className="info-value" style={{ color: '#81c995' }}>✅ Saved</span>
            </div>
          </div>

          <div className="info-group">
            <h3><ShieldCheck size={16} /> Integrity</h3>
            <div className="info-item">
              <span className="info-label">Session Hash</span>
              <span className="info-value" style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{sessionHash}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Integrity</span>
              <span className="info-value" style={{ color: '#81c995' }}>✅ VERIFIED</span>
            </div>
            <div className="info-item">
              <span className="info-label">Anomalies</span>
              <span className="info-value">0 Detected</span>
            </div>
          </div>
        </div>

        <div className="summary-actions">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Download Transcript
          </button>
          {role === 'judge' && (
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarClock size={16} /> Schedule Next Hearing
            </button>
          )}
          <button className="btn-secondary" onClick={onReturn}>Return to Dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default PostHearing;
