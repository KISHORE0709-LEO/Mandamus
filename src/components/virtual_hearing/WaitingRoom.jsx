import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, XCircle, CheckCircle, ChevronRight, Copy, UserPlus } from 'lucide-react';
import { addParticipant, subscribeToParticipantsByRoom, updateParticipantStatus } from '../../lib/firestoreHelpers';
import { useAuth } from '../../context/AuthContext';


const INITIAL_PARTICIPANTS = [
  { id: 'p1', name: 'Hon. Justice R. Vance', role: 'Judge',   status: 'verified' },
  { id: 'p2', name: 'Adv. Priya Nair',       role: 'Lawyer',  status: 'waiting' },
  { id: 'p3', name: 'Adv. S. Chatterjee',    role: 'Lawyer',  status: 'unverified' },
  { id: 'p4', name: 'Arjun Mehta',           role: 'Accused', status: 'joining' },
];

const STATUS_MAP = {
  verified:   { icon: <ShieldCheck size={14} />, label: 'Verified',                color: '#81c995' },
  waiting:    { icon: <Clock size={14} />,        label: 'Waiting',                 color: '#fcc934' },
  unverified: { icon: <XCircle size={14} />,      label: 'Not Verified',            color: '#f28b82' },
  joining:    { icon: <Clock size={14} />,        label: 'Joining (Secure Facility)', color: '#8ab4f8' },
  admitted:   { icon: <CheckCircle size={14} />,  label: 'Admitted',                color: '#81c995' },
  rejected:   { icon: <XCircle size={14} />,      label: 'Rejected',                color: '#f28b82' },
};

const WaitingRoom = ({ role, caseData, roomId, onStart }) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [myParticipantId, setMyParticipantId] = useState(null);

  // 1. Register self and listen to participants
  useEffect(() => {
    if (!roomId || !user?.uid || myParticipantId) return;

    let mounted = true;

    // Register self ONLY if not already in list
    const registerSelf = async () => {
      try {
        // Check if we are already in the participants list to prevent duplicates on refresh
        const existing = participants.find(p => p.uid === user.uid);
        if (existing) {
          if (mounted) setMyParticipantId(existing.id);
          return;
        }

        const id = await addParticipant({
          roomId,
          name: user?.displayName || (role === 'judge' ? 'Hon. Judge' : 'Guest Participant'),
          role: role.charAt(0).toUpperCase() + role.slice(1),
          uid: user.uid,
        });
        if (mounted) setMyParticipantId(id);
      } catch (err) {
        console.error("Registration error:", err);
      }
    };

    registerSelf();

    // Subscribe to all participants in this room
    const unsubscribe = subscribeToParticipantsByRoom(roomId, (data) => {
      if (!mounted) return;
      setParticipants(data);
      
      // Auto-join if admitted
      const me = data.find(p => p.uid === user?.uid);
      if (me && me.status === 'admitted' && role !== 'judge') {
        onStart();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [roomId, user, role, myParticipantId, participants.length]); // Re-run only if room/user changes or list size changes


  const handleAdmit  = async (id) => await updateParticipantStatus(id, 'admitted');
  const handleReject = async (id) => await updateParticipantStatus(id, 'rejected');


  return (
    <div className="vh-center-wrap">
      <div className="vh-panel vh-panel-wide">
        <div className="vh-pre-badge" style={{ background: 'rgba(130,195,149,0.1)', color: '#81c995', borderColor: '#81c995' }}>
          <ShieldCheck size={14} /> IDENTITY VERIFIED — WAITING ROOM
        </div>

        <h2 className="vh-panel-title">{caseData?.name}</h2>
        <p className="vh-panel-sub">Room: {caseData?.room} &nbsp;|&nbsp; {caseData?.time}</p>
        {roomId && (
          <div className="vh-meeting-share vh-share-prominent">
            <div className="vh-share-header">
              <div className="vh-share-label">SHARE_HEARING_LINK</div>
              <div className="vh-status-pill vh-pill-code">ENTRY_VIA_CODE</div>
            </div>
            <div className="vh-share-box">
              <span className="vh-share-url">{window.location.origin}/hearing/{roomId}</span>
              <div className="vh-share-actions">
                <button 
                  className="vh-copy-btn-large" 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/hearing/${roomId}`);
                    alert('⚖️ MANDAMUS: Hearing Link Copied to Clipboard!');
                  }}
                  title="Copy Link"
                >
                  <Copy size={16} /> COPY_LINK
                </button>
              </div>
            </div>
            <p className="vh-share-hint">Send this link to other participants to join this hearing instantly.</p>
          </div>
        )}

        <div className="vh-participants-list">
          {participants.map(p => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.waiting;
            return (
              <div key={p.id} className={`vh-participant-row ${p.status === 'pending' ? 'vh-row-pending' : ''}`}>
                <div className="vh-participant-avatar">{p.name[0]}</div>
                <div className="vh-participant-info">
                  <div className="vh-participant-name">{p.name}</div>
                  <div className="vh-participant-role">{p.role}</div>
                </div>
                <div className="vh-participant-status" style={{ color: s.color }}>
                  {s.icon} {s.label}
                </div>
                {role === 'judge' && p.status === 'pending' && (
                  <div className="vh-admit-controls">
                    <button className="vh-btn-admit" onClick={() => handleAdmit(p.id)}>ADMIT</button>
                    <button className="vh-btn-reject" onClick={() => handleReject(p.id)}>REJECT</button>
                  </div>
                )}
              </div>
            );
          })}
          {participants.length === 0 && (
            <div className="vh-waiting-empty">
              <UserPlus size={20} /> Initializing room participants...
            </div>
          )}
        </div>

        {role === 'judge' ? (
          <button className="vh-btn-primary vh-btn-full" style={{ marginTop: '2rem' }} onClick={onStart}>
            Start Hearing <ChevronRight size={18} />
          </button>
        ) : (
          <div className="vh-waiting-notice">
            <Clock size={16} /> Waiting for the Judge to start the hearing…
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
