import React, { useState, useEffect } from 'react';
import { Camera, Mic, Wifi, ShieldCheck, UserCheck, Key, VideoOff, MicOff } from 'lucide-react';

const PreCheck = ({ stage, setStage, role, setRole }) => {
  const [checking, setChecking] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [progress, setProgress] = useState(0);

  // Simulated Biometric Verification State
  const [faceVerified, setFaceVerified] = useState(false);
  const [voiceVerified, setVoiceVerified] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    if (stage !== 'pre-check') return;
    
    // Simulate complex check workflow
    const timer1 = setTimeout(() => { setFaceVerified(true); setProgress(33); }, 2000);
    const timer2 = setTimeout(() => { setVoiceVerified(true); setProgress(66); }, 4000);
    const timer3 = setTimeout(() => { 
      setOtpVerified(true); 
      setProgress(100); 
      setChecking(false);
    }, 6000);

    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, [stage]);

  const allVerified = faceVerified && voiceVerified && otpVerified;

  if (stage === 'waiting-room') {
    return (
      <div className="precheck-container">
        <div className="precheck-panel" style={{ textAlign: 'center', margin: '0 auto' }}>
          <div className="step-icon active" style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px' }}>
            <ShieldCheck size={32} />
          </div>
          <h2>Waiting for the Judge</h2>
          <p>Your identity has been cryptographically verified. The presiding Judge will admit you to the Secure Hearing Room shortly.</p>
          <div className="security-badge" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
            <span>SHA-256 Session Token: 8F3C...A9E8</span>
          </div>
          <button className="join-btn" onClick={() => setStage('live-session')}>
            [DEV] Simulate Judge Admission
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="precheck-container">
      <div className="precheck-content">
        <div className="camera-preview-wrapper">
          {cameraOn ? (
            <div className="scan-overlay">
              {!faceVerified && <div className="scan-line"></div>}
              {role === 'judge' ? (
                <img src="/avatars/judge.png" alt="Judge" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : role === 'petitioner' ? (
                <img src="/avatars/petitioner.png" alt="Petitioner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src="/avatars/respondent.png" alt="Respondent" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {faceVerified && (
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: '#137333', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ShieldCheck size={14} /> IDENTITY VERIFIED
                </div>
              )}
            </div>
          ) : (
            <div className="camera-placeholder">
              <VideoOff size={48} />
              <span>Camera is off</span>
            </div>
          )}
          
          <div className="device-status">
            <div className={`status-badge ${cameraOn ? 'ok' : 'error'}`}>
              {cameraOn ? <Camera size={14} /> : <VideoOff size={14} />} {cameraOn ? 'Ready' : 'Off'}
            </div>
            <div className={`status-badge ${micOn ? 'ok' : 'error'}`}>
              {micOn ? <Mic size={14} /> : <MicOff size={14} />} {micOn ? 'Ready' : 'Off'}
            </div>
            <div className="status-badge ok">
              <Wifi size={14} /> Strong
            </div>
          </div>
          
          <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="control-btn" style={{ width: '40px', height: '40px', backgroundColor: micOn ? 'rgba(0,0,0,0.6)' : '#ea4335' }} onClick={() => setMicOn(!micOn)}>
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button className="control-btn" style={{ width: '40px', height: '40px', backgroundColor: cameraOn ? 'rgba(0,0,0,0.6)' : '#ea4335' }} onClick={() => setCameraOn(!cameraOn)}>
              {cameraOn ? <Camera size={18} /> : <VideoOff size={18} />}
            </button>
          </div>
        </div>

        <div className="precheck-panel">
          <h2>Ready to join?</h2>
          <p>Complete mandatory biometric verification.</p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#5f6368', marginBottom: '0.5rem' }}>Select Role (Mock)</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '1rem' }}
            >
              <option value="judge">Judge (Presiding)</option>
              <option value="petitioner">Petitioner Counsel</option>
              <option value="respondent">Respondent Counsel</option>
            </select>
          </div>

          <div className="auth-steps">
            <div className="auth-step">
              <div className={`step-icon ${faceVerified ? 'success' : 'active'}`}>
                <UserCheck size={20} />
              </div>
              <div className="step-info">
                <h4>DeepFace Verification</h4>
                <span>{faceVerified ? 'Match found: 99.8%' : 'Scanning facial vectors...'}</span>
              </div>
            </div>
            
            <div className="auth-step">
              <div className={`step-icon ${voiceVerified ? 'success' : (faceVerified ? 'active' : '')}`}>
                <Mic size={20} />
              </div>
              <div className="step-info">
                <h4>Voice Authentication</h4>
                <span>{voiceVerified ? 'Voiceprint verified' : (faceVerified ? 'Analyzing audio spectrum...' : 'Waiting...')}</span>
              </div>
            </div>

            <div className="auth-step">
              <div className={`step-icon ${otpVerified ? 'success' : (voiceVerified ? 'active' : '')}`}>
                <Key size={20} />
              </div>
              <div className="step-info">
                <h4>OTP Verification</h4>
                <span>{otpVerified ? 'Token validated' : (voiceVerified ? 'Verifying secure token...' : 'Waiting...')}</span>
              </div>
            </div>
          </div>

          <button 
            className="join-btn" 
            disabled={!allVerified}
            onClick={() => role === 'judge' ? setStage('live-session') : setStage('waiting-room')}
          >
            {checking ? `Verifying... ${progress}%` : (role === 'judge' ? 'Start Session' : 'Ask to Join')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreCheck;
