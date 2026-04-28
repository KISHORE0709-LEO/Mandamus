import React from 'react';
import { Scale, Users, Lock, ClipboardList, ChevronRight, Clock } from 'lucide-react';

const MOCK_CASES = [
  { id: 'MH-HC-2024-4471', name: 'State of Maharashtra vs. Arjun Mehta', time: '10:00 AM', room: 'COURT-7A', status: 'Scheduled', date: '25 Jul 2025' },
  { id: 'DL-HC-2024-1192', name: 'Union of India vs. Priya Sharma', time: '12:30 PM', room: 'COURT-3B', status: 'Pending Docs', date: '25 Jul 2025' },
  { id: 'KA-HC-2024-8823', name: 'Rajan Exports vs. HDFC Bank Ltd.', time: '03:00 PM', room: 'COURT-12C', status: 'Ready', date: '25 Jul 2025' },
];

const STATUS_COLOR = {
  'Scheduled': '#fcc934',
  'Pending Docs': '#f28b82',
  'Ready': '#81c995',
};

const roleConfig = {
  judge: {
    icon: <Scale size={28} />,
    title: "Judge's Hearing Dashboard",
    subtitle: "Today's scheduled hearings. Select a case to begin.",
    btnLabel: 'Start Hearing',
  },
  lawyer: {
    icon: <Users size={28} />,
    title: 'Assigned Cases',
    subtitle: 'Your assigned hearings for today. Select a case to join.',
    btnLabel: 'Join Hearing',
  },
  custody: {
    icon: <Lock size={28} />,
    title: 'Custody Node — Secure Access',
    subtitle: 'Accused hearing access via secure facility terminal.',
    btnLabel: 'Join Secure Hearing',
  },
  clerk: {
    icon: <ClipboardList size={28} />,
    title: "Clerk's Hearing Log",
    subtitle: 'Observer access to scheduled hearings.',
    btnLabel: 'Observe Hearing',
  },
};

const Dashboard = ({ role, onCaseSelect }) => {
  const cfg = roleConfig[role] || roleConfig.clerk;

  return (
    <div className="vh-dashboard">
      <div className="vh-dashboard-header">
        <div className="vh-dashboard-icon">{cfg.icon}</div>
        <div>
          <h1 className="vh-dashboard-title">{cfg.title}</h1>
          <p className="vh-dashboard-sub">{cfg.subtitle}</p>
        </div>
        {role === 'custody' && (
          <div className="vh-custody-badge">🔒 ACCESS VIA SECURE FACILITY</div>
        )}
      </div>

      <div className="vh-case-list">
        {MOCK_CASES.map(c => (
          <div key={c.id} className="vh-case-card">
            <div className="vh-case-left">
              <div className="vh-case-id">{c.id}</div>
              <div className="vh-case-name">{c.name}</div>
              <div className="vh-case-meta">
                <span><Clock size={12} /> {c.time}</span>
                <span>📍 {c.room}</span>
                <span>📅 {c.date}</span>
              </div>
              {role === 'custody' && (
                <div className="vh-custody-note">Accused: Arjun Mehta &nbsp;|&nbsp; Facility: Arthur Road Jail</div>
              )}
            </div>
            <div className="vh-case-right">
              <span className="vh-status-badge" style={{ color: STATUS_COLOR[c.status], borderColor: STATUS_COLOR[c.status] }}>
                ● {c.status}
              </span>
              <button className="vh-btn-primary" onClick={() => onCaseSelect(c)}>
                {cfg.btnLabel} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
