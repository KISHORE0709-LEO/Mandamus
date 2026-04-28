import React, { useState } from 'react';
import PreCheck from './PreCheck';
import LiveRoom from './LiveRoom';
import PostHearing from './PostHearing';
import './VirtualHearing.css';

const VirtualHearing = () => {
  // states: 'pre-check', 'waiting-room', 'live-session', 'post-hearing'
  const [stage, setStage] = useState('pre-check');
  const [role, setRole] = useState('judge'); // 'judge', 'petitioner', 'respondent', 'accused'

  const handleStageChange = (newStage) => {
    setStage(newStage);
  };

  return (
    <div className="virtual-hearing-container">
      {stage === 'pre-check' || stage === 'waiting-room' ? (
        <PreCheck stage={stage} setStage={handleStageChange} role={role} setRole={setRole} />
      ) : stage === 'live-session' ? (
        <LiveRoom setStage={handleStageChange} role={role} />
      ) : (
        <PostHearing setStage={handleStageChange} role={role} />
      )}
    </div>
  );
};

export default VirtualHearing;
