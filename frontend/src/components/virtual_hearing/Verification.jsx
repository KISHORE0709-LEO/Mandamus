import React, { useState, useRef, useEffect } from 'react';
import { UserCheck, Mic, Key, ShieldCheck, ChevronRight, Camera } from 'lucide-react';

const STEPS = [
  { id: 'face',  icon: <UserCheck size={20} />, label: 'Face Verification',  desc: 'Align your face within the frame' },
  { id: 'voice', icon: <Mic size={20} />,       label: 'Voice Authentication', desc: 'Say: "I confirm my identity"' },
  { id: 'otp',   icon: <Key size={20} />,        label: 'OTP Verification',    desc: 'Enter the OTP sent to your device' },
];

const Verification = ({ role, caseData, onVerified }) => {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0=face,1=voice,2=otp
  const [stepsDone, setStepsDone] = useState([]);
  const [running, setRunning] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [allDone, setAllDone] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start camera when verification begins
  useEffect(() => {
    if (!started) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {}); // camera denied — still allow demo flow
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [started]);

  const runStep = (stepIdx) => {
    if (stepIdx === 2) return; // OTP is manual
    setRunning(true);
    setTimeout(() => {
      setStepsDone(prev => [...prev, STEPS[stepIdx].id]);
      setRunning(false);
      if (stepIdx < 2) setCurrentStep(stepIdx + 1);
      else setAllDone(true);
    }, 3000);
  };

  const handleOtp = () => {
    if (otp.length < 4) { setOtpError('Enter a valid OTP.'); return; }
    setOtpError('');
    setStepsDone(prev => [...prev, 'otp']);
    setAllDone(true);
  };

  const progress = Math.round((stepsDone.length / 3) * 100);

  if (!started) {
    return (
      <div className="vh-center-wrap">
        <div className="vh-panel" style={{ textAlign: 'center' }}>
          <div className="vh-verify-icon"><Camera size={36} /></div>
          <h2 className="vh-panel-title">Identity Verification</h2>
          <p className="vh-panel-sub">
            Your camera will be activated for biometric verification.<br />
            This is required to enter the hearing room.
          </p>
          <div className="vh-steps-preview">
            {STEPS.map(s => (
              <div key={s.id} className="vh-step-preview-row">
                <span className="vh-step-dot" />{s.label}
              </div>
            ))}
          </div>
          <button className="vh-btn-primary vh-btn-full" onClick={() => { setStarted(true); setTimeout(() => runStep(0), 500); }}>
            Start Verification <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vh-verify-layout">
      {/* Camera feed */}
      <div className="vh-camera-wrap">
        <video ref={videoRef} autoPlay muted playsInline className="vh-camera-feed" />
        <div className="vh-scan-line" />
        {stepsDone.includes('face') && (
          <div className="vh-verified-overlay">
            <ShieldCheck size={16} /> IDENTITY VERIFIED
          </div>
        )}
        <div className="vh-camera-label">LIVE FEED — {caseData?.room}</div>
      </div>

      {/* Steps panel */}
      <div className="vh-panel">
        <h2 className="vh-panel-title">Biometric Verification</h2>
        <p className="vh-panel-sub">{caseData?.name}</p>

        {/* Progress bar */}
        <div className="vh-progress-track">
          <div className="vh-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="vh-progress-label">{progress}% Complete</div>

        <div className="vh-steps-list">
          {STEPS.map((step, i) => {
            const done = stepsDone.includes(step.id);
            const active = currentStep === i && started && !done;
            return (
              <div key={step.id} className={`vh-step ${done ? 'vh-step-done' : active ? 'vh-step-active' : 'vh-step-pending'}`}>
                <div className="vh-step-icon">{done ? <ShieldCheck size={18} /> : step.icon}</div>
                <div className="vh-step-info">
                  <div className="vh-step-label">{step.label}</div>
                  <div className="vh-step-desc">
                    {done ? '✅ Verified' : active ? (running ? 'Processing…' : step.desc) : 'Waiting…'}
                  </div>
                </div>
                {/* OTP input */}
                {step.id === 'otp' && active && !running && (
                  <div className="vh-otp-wrap">
                    <input
                      className="vh-otp-input"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      maxLength={6}
                    />
                    <button className="vh-btn-sm" onClick={handleOtp}>Verify</button>
                    {otpError && <div className="vh-otp-error">{otpError}</div>}
                  </div>
                )}
                {/* Trigger next step button */}
                {step.id !== 'otp' && active && !running && (
                  <button className="vh-btn-sm" onClick={() => runStep(i)}>Scan</button>
                )}
              </div>
            );
          })}
        </div>

        {allDone && (
          <button className="vh-btn-primary vh-btn-full" style={{ marginTop: '1.5rem' }} onClick={onVerified}>
            Enter Waiting Room <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Verification;
