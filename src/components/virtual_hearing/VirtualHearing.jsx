import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Dashboard from './Dashboard';
import CasePreHearing from './CasePreHearing';
import Verification from './Verification';
import WaitingRoom from './WaitingRoom';
import LiveRoom from './LiveRoom';
import PostHearing from './PostHearing';
import './VirtualHearing.css';

// STAGES: dashboard → pre-hearing → verification → waiting-room → live-session → post-hearing

const VirtualHearing = () => {
  const { role: authRole } = useAuth();
  const role = authRole || 'judge';
  const [stage, setStage] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState(null);

  const handleCaseSelect = (c) => { setSelectedCase(c); setStage('pre-hearing'); };

  return (
    <div className="virtual-hearing-container">
      {stage === 'dashboard'     && <Dashboard role={role} onCaseSelect={handleCaseSelect} />}
      {stage === 'pre-hearing'   && <CasePreHearing role={role} caseData={selectedCase} onProceed={() => setStage('verification')} onBack={() => setStage('dashboard')} />}
      {stage === 'verification'  && <Verification role={role} caseData={selectedCase} onVerified={() => setStage('waiting-room')} />}
      {stage === 'waiting-room'  && <WaitingRoom role={role} caseData={selectedCase} onStart={() => setStage('live-session')} />}
      {stage === 'live-session'  && <LiveRoom role={role} caseData={selectedCase} setStage={setStage} />}
      {stage === 'post-hearing'  && <PostHearing role={role} caseData={selectedCase} onReturn={() => setStage('dashboard')} />}
    </div>
  );
};

export default VirtualHearing;
