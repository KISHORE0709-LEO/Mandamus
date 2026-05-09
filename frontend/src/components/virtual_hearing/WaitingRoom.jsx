import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, XCircle, CheckCircle, ChevronRight, Copy, UserPlus, Check, Link as LinkIcon } from 'lucide-react';
import { addParticipant, subscribeToParticipantsByRoom, updateParticipantStatus, getHearingByRoomId } from '../../lib/firestoreHelpers';
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyMeetingCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/hearing/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const registrationAttempted = React.useRef(false);
  const [hearing, setHearing] = useState(null);

  useEffect(() => {
    if (roomId) {
      getHearingByRoomId(roomId).then(setHearing);
    }
  }, [roomId]);
  
  // 1. Register self and listen to participants
  useEffect(() => {
    if (!roomId || !user?.uid || registrationAttempted.current) return;
    
    registrationAttempted.current = true;
    let mounted = true;

    const registerSelf = async () => {
      try {
        const id = await addParticipant({
          roomId,
          name: user?.displayName || (role === 'judge' ? 'Hon. Judge' : 'Guest Participant'),
          role: role.charAt(0).toUpperCase() + role.slice(1),
          uid: user.uid,
          status: role === 'judge' ? 'admitted' : 'pending' 
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
  }, [roomId, user, role, onStart]); 


  const handleAdmit  = async (id) => await updateParticipantStatus(id, 'admitted');
  const handleReject = async (id) => await updateParticipantStatus(id, 'rejected');

  // Derive display list: Active participants + Expected parties (if not joined)
  const getDisplayParticipants = () => {
    const list = [...participants];
    
    // Filter out the current judge from the list (they don't need to admit themselves)
    const filtered = list.filter(p => p.uid !== user?.uid || role !== 'judge');

    // Add expected parties if they haven't joined yet
    if (hearing?.parties) {
      const partyNames = hearing.parties.split('·').map(s => s.trim());
      partyNames.forEach(name => {
        const joined = participants.some(p => p.name.toLowerCase().includes(name.toLowerCase()));
        if (!joined) {
          filtered.push({
            id: `expected-${name}`,
            name: name,
            role: 'Party to Case',
            status: 'joining', // Shows as "Joining (Secure Facility)"
            isExpected: true
          });
        }
      });
    }

    return filtered;
  };

  const displayList = getDisplayParticipants();

  return (
    <div className="vh-center-wrap">
      <div className="vh-panel vh-panel-wide">
        <div className="vh-pre-badge" style={{ background: 'rgba(130,195,149,0.1)', color: '#81c995', borderColor: '#81c995' }}>
          <ShieldCheck size={14} /> IDENTITY VERIFIED — WAITING ROOM
        </div>

        <h2 className="vh-panel-title">{hearing?.caseName || caseData?.name || "Virtual Hearing"}</h2>
        <p className="vh-panel-sub">Room: {hearing?.roomId || roomId} &nbsp;|&nbsp; {hearing?.scheduledTime || "10:00"}</p>
        
        {roomId && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              MEETING CODE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(224,32,32,0.07)', border: '1px solid rgba(224,32,32,0.2)', padding: '0.7rem 1rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#e02020', fontWeight: '600', letterSpacing: '0.15em', flex: 1 }}>
                {roomId}
              </span>
              <button 
                onClick={copyMeetingCode}
                style={{ background: copiedCode ? '#81c995' : '#e02020', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                title="Copy Code"
              >
                {copiedCode ? <><Check size={12} /> COPIED</> : <><Copy size={12} /> COPY</>}
              </button>
            </div>
            <button 
              onClick={copyMeetingLink}
              style={{ marginTop: '0.5rem', width: '100%', background: copiedLink ? '#81c995' : 'rgba(224,32,32,0.1)', color: copiedLink ? '#fff' : '#e02020', border: '1px solid rgba(224,32,32,0.3)', padding: '0.5rem', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
            >
              {copiedLink ? <><Check size={13} /> LINK COPIED</> : <><LinkIcon size={13} /> COPY JOIN LINK</>}
            </button>
          </div>
        )}

        <div className="vh-participants-list">
          {displayList.map(p => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.waiting;
            return (
              <div key={p.id} className={`vh-participant-row ${p.status === 'pending' ? 'vh-row-pending' : ''}`}>
                <div className="vh-participant-avatar" style={{ background: p.isExpected ? '#333' : '#e02020' }}>
                  {p.name[0]}
                </div>
                <div className="vh-participant-info">
                  <div className="vh-participant-name">{p.name}</div>
                  <div className="vh-participant-role">{p.role}</div>
                </div>
                <div className="vh-participant-status" style={{ color: s.color }}>
                  {s.icon} {s.label}
                </div>
                {role === 'judge' && p.status === 'pending' && !p.isExpected && (
                  <div className="vh-admit-controls">
                    <button className="vh-btn-admit" onClick={() => handleAdmit(p.id)}>ADMIT</button>
                    <button className="vh-btn-reject" onClick={() => handleReject(p.id)}>REJECT</button>
                  </div>
                )}
              </div>
            );
          })}
          {displayList.length === 0 && (
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
