import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldCheck, FileText, CheckCircle2, PlayCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './JudgeDashboard.css';

const MOCK_APPROVALS = [
  { id: 'app-1', title: 'State v. Sharma Enterprises', type: 'CORPORATE FRAUD', time: '14:30', clerk: 'Clerk ID-942' },
];

const MOCK_DOCKET = [
  { id: 'doc-1', title: 'Verma Property Dispute', type: 'CIVIL MATTERS', time: '10:00 AM', score: 98, status: 'READY' },
  { id: 'doc-2', title: 'Republic v. Rajan', type: 'CRIMINAL APPEAL', time: '11:30 AM', score: 100, status: 'ADJOURNED' },
  { id: 'doc-3', title: 'TechCorp v. Innovate', type: 'IP TRIBUNAL', time: '16:00 PM', score: 85, status: 'PENDING DOCS' }
];

export default function JudgeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);
  const [scheduled, setScheduled] = useState([]);

  const handleApprove = (app) => {
    // Generate secure mock codes
    const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;
    const judgeCode = Math.floor(100000 + Math.random() * 900000);
    const lawyerCode = Math.floor(100000 + Math.random() * 900000);
    
    setScheduled([...scheduled, { ...app, roomId, judgeCode, lawyerCode }]);
    setApprovals(approvals.filter(a => a.id !== app.id));
  };

  const navigateToWorkspace = (feature, caseId) => {
    navigate(`/dashboard?feature=${feature}&caseId=${caseId}`);
  };

  const startHearing = (roomId) => {
    navigate(`/hearing/${roomId}`);
  };

  return (
    <div className="jd-page">
      {/* HEADER */}
      <div className="jd-header">
        <div className="jd-title-group">
          <h1 className="jd-title">JUDICIAL_COMMAND_CENTER</h1>
          <span className="jd-sub">AUTHENTICATED ROLE: HON'BLE JUDGE · ID: {user?.uid?.substring(0,8) || 'JDG-001'}</span>
        </div>
        <div className="jd-user-badge">
          SECURE SESSION
        </div>
      </div>

      {/* METRICS */}
      <div className="jd-metrics">
        <div className="jd-metric-card jd-metric-red">
          <span className="jd-metric-val">02</span>
          <span className="jd-metric-lbl">URGENT MATTERS</span>
        </div>
        <div className="jd-metric-card">
          <span className="jd-metric-val">04</span>
          <span className="jd-metric-lbl">HEARINGS TODAY</span>
        </div>
        <div className="jd-metric-card">
          <span className="jd-metric-val">12</span>
          <span className="jd-metric-lbl">PENDING DRAFTS</span>
        </div>
        <div className="jd-metric-card">
          <span className="jd-metric-val">96%</span>
          <span className="jd-metric-lbl">AVG READINESS SCORE</span>
        </div>
      </div>

      <div className="jd-grid">
        {/* LEFT COLUMN: APPROVALS */}
        <div className="jd-col">
          <h2 className="jd-section-title"><ShieldCheck size={18} /> PENDING APPROVALS</h2>
          
          {approvals.length === 0 && scheduled.length === 0 && (
             <div style={{ color: '#888', fontSize: '0.8rem', padding: '20px', border: '1px dashed #333' }}>No pending approvals.</div>
          )}

          {approvals.map(app => (
            <div key={app.id} className="jd-approval-card">
              <div className="jd-approval-header">
                <span className="jd-approval-type">{app.type}</span>
                <span className="jd-approval-time"><Clock size={12} style={{ display:'inline', marginBottom:'-2px' }}/> {app.time}</span>
              </div>
              <div className="jd-approval-title">{app.title}</div>
              <div className="jd-approval-info">Proposed by: {app.clerk}</div>
              <button className="jd-approve-btn" onClick={() => handleApprove(app)}>
                <CheckCircle2 size={14} /> APPROVE & SCHEDULE
              </button>
            </div>
          ))}

          {scheduled.map(app => (
            <div key={`sched-${app.id}`} className="jd-scheduled-panel">
              <div className="jd-scheduled-title">✓ HEARING SECURED & SCHEDULED</div>
              <div className="jd-creds">
                <div>JUDGE_CODE: <span className="jd-cred-val">{app.judgeCode}</span></div>
                <div>LAWYER_CODE: <span className="jd-cred-val">{app.lawyerCode}</span></div>
                <div>ROOM_ID: <span className="jd-cred-val">{app.roomId}</span></div>
              </div>
              <button className="jd-start-hearing-btn" onClick={() => startHearing(app.roomId)}>
                <PlayCircle size={14} /> START VIRTUAL HEARING
              </button>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: DOCKET */}
        <div className="jd-col">
          <h2 className="jd-section-title"><FileText size={18} /> TODAY'S DOCKET</h2>
          <div className="jd-docket-list">
            {MOCK_DOCKET.map(doc => (
              <div key={doc.id} className="jd-docket-card">
                <div className="jd-docket-time">
                  <span className="jd-docket-time-val">{doc.time.split(' ')[0]}</span>
                  <span className="jd-docket-time-lbl">{doc.time.split(' ')[1]}</span>
                </div>
                <div className="jd-docket-main">
                  <div>
                    <div className="jd-docket-header">
                      <h3 className="jd-docket-title">{doc.title}</h3>
                      <span className="jd-docket-score">RS: {doc.score}%</span>
                    </div>
                    <span className="jd-docket-type">{doc.type} · STATUS: {doc.status}</span>
                  </div>
                  
                  <div className="jd-docket-actions">
                    <button 
                      className="jd-action-btn jd-action-summarize"
                      onClick={() => navigateToWorkspace('summariser', doc.id)}
                    >
                      <AlertCircle size={14} /> SUMMARIZE CASE
                    </button>
                    <button 
                      className="jd-action-btn jd-action-draft"
                      onClick={() => navigateToWorkspace('draft', doc.id)}
                    >
                      <FileText size={14} /> VIEW DRAFT
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
