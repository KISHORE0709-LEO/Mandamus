import React from 'react';
import { ShieldCheck, FileText, Activity, BrainCircuit, CalendarClock, Download } from 'lucide-react';

const PostHearing = ({ setStage, role }) => {
  return (
    <div className="post-hearing">
      <div className="summary-card">
        <div className="summary-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(214,40,40,0.1)', color: 'var(--primary-red)', marginBottom: '1rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h2>Session Cryptographically Secured</h2>
          <p>The hearing record has been finalized, hashed, and stored immutably.</p>
        </div>

        <div className="summary-content">
          <div className="info-group">
            <h3><FileText size={18} /> Archival Record</h3>
            <div className="info-item">
              <span className="info-label">Session ID</span>
              <span className="info-value">8B21-ALPHA-Z9X</span>
            </div>
            <div className="info-item">
              <span className="info-label">SHA-256 Hash Integrity</span>
              <span className="info-value" style={{ fontSize: '0.75rem' }}>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
            </div>
            <div className="info-item">
              <span className="info-label">Access Logs</span>
              <span className="info-value">3 Authenticated Terminals, 0 Anomalies</span>
            </div>
          </div>

          <div className="info-group">
            <h3><BrainCircuit size={18} /> AI Intelligence Insights</h3>
            <div className="ai-insight">
              <span style={{ fontSize: '0.9rem' }}>Bias Detection Score</span>
              <span className="insight-score" style={{ color: '#137333' }}>98% Neutral</span>
            </div>
            <div className="ai-insight">
              <span style={{ fontSize: '0.9rem' }}>Decision Transparency</span>
              <span className="insight-score">High</span>
            </div>
            <div className="ai-insight">
              <span style={{ fontSize: '0.9rem' }}>Case Urgency Prediction</span>
              <span className="insight-score" style={{ color: '#d93025' }}>Critical</span>
            </div>
          </div>
        </div>

        <div className="summary-actions">
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Download Transcript
          </button>
          {role === 'judge' && (
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarClock size={16} /> Auto-Schedule Next Hearing
            </button>
          )}
          <button className="btn-secondary" onClick={() => setStage('pre-check')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostHearing;
