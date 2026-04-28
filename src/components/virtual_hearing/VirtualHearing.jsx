import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Dashboard from './Dashboard';
import CasePreHearing from './CasePreHearing';
import Verification from './Verification';
import WaitingRoom from './WaitingRoom';
import LiveRoom from './LiveRoom';
import PostHearing from './PostHearing';
import './VirtualHearing.css';

// Generate a Google Meet-style room ID: xxx-xxxx-xxx
const generateRoomId = () => {
  const seg = (n) => Math.random().toString(36).substring(2, 2 + n);
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
};

const VirtualHearing = () => {
  const { role: authRole, user } = useAuth();
  const role = authRole || 'judge';

  const [stage,        setStage]        = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState(null);
  const [roomId,       setRoomId]       = useState(null);

  const handleCaseSelect = (c) => { setSelectedCase(c); setStage('pre-hearing'); };

  // Judge generates roomId on Start Hearing; others join with existing roomId
  const handleStart = () => {
    if (role === 'judge') setRoomId(generateRoomId());
    setStage('live-session');
  };

  return (
    <div className="virtual-hearing-container">
      {stage === 'dashboard'    && <Dashboard role={role} onCaseSelect={handleCaseSelect} />}
      {stage === 'pre-hearing'  && <CasePreHearing role={role} caseData={selectedCase} onProceed={() => setStage('verification')} onBack={() => setStage('dashboard')} />}
      {stage === 'verification' && <Verification role={role} caseData={selectedCase} onVerified={() => setStage('waiting-room')} />}
      {stage === 'waiting-room' && <WaitingRoom role={role} caseData={selectedCase} roomId={roomId} onStart={handleStart} />}
      {stage === 'live-session' && (
        <LiveRoom
          role={role}
          caseData={selectedCase}
          roomId={roomId}
          userId={user?.uid || 'guest-' + Math.random().toString(36).slice(2)}
          userName={user?.displayName || role}
          setStage={setStage}
        />
      )}
      {stage === 'post-hearing' && <PostHearing role={role} caseData={selectedCase} onReturn={() => setStage('dashboard')} />}
    </div>
  );
};

export default VirtualHearing;
