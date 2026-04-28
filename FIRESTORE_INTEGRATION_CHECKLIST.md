# 🎯 Firestore Integration Checklist

Use this checklist to integrate Firestore into your Mandamus platform step by step.

---

## ✅ Phase 1: Setup (COMPLETED)

- [x] Install Firebase SDK
- [x] Create Firestore collections
- [x] Populate sample data
- [x] Create security rules
- [x] Create helper functions
- [x] Document everything

**Status**: ✅ COMPLETE - All collections are live!

---

## 🔄 Phase 2: Scheduler Integration (NEXT STEP)

### File: `src/components/Scheduler.jsx`

- [ ] **Step 1**: Import helper functions
  ```javascript
  import { createHearing, getHearingsByJudge, deleteHearing } from '../lib/firestoreHelpers';
  import { useAuth } from '../context/AuthContext';
  ```

- [ ] **Step 2**: Replace sessionStorage with Firestore
  ```javascript
  // REMOVE:
  const [meetings, setMeetings] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sc_meetings') || '[]'); }
    catch { return []; }
  });

  // REPLACE WITH:
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      getHearingsByJudge(user.uid).then(setMeetings);
    }
  }, [user]);
  ```

- [ ] **Step 3**: Update handleSchedule function
  ```javascript
  const handleSchedule = async () => {
    if (!validate()) return;
    
    const hearingData = {
      caseId: state.case_id || summary.caseId || '—',
      caseName: form.title,
      judgeId: user.uid,
      scheduledDate: form.date,
      scheduledTime: form.time,
      type: form.type,
      parties: form.parties,
      agenda: form.agenda,
      draftAttached: form.attachDraft && hasDraft,
      participants: [user.uid]
    };

    await createHearing(hearingData);
    const updated = await getHearingsByJudge(user.uid);
    setMeetings(updated);
    setSubmitted(true);
  };
  ```

- [ ] **Step 4**: Update handleDelete function
  ```javascript
  const handleDelete = async (id) => {
    await deleteHearing(id);
    const updated = await getHearingsByJudge(user.uid);
    setMeetings(updated);
  };
  ```

- [ ] **Step 5**: Remove sessionStorage.setItem
  ```javascript
  // REMOVE this useEffect:
  useEffect(() => {
    sessionStorage.setItem('sc_meetings', JSON.stringify(meetings));
  }, [meetings]);
  ```

- [ ] **Step 6**: Test scheduler
  - [ ] Create a hearing
  - [ ] Verify it appears in Firebase Console
  - [ ] Delete a hearing
  - [ ] Refresh page - data should persist

**Estimated Time**: 15 minutes

---

## 🔄 Phase 3: Virtual Hearing Integration

### File: `src/components/virtual_hearing/VirtualHearing.jsx`

- [ ] **Step 1**: Import helper functions
  ```javascript
  import { createRoom, getRoom } from '../../lib/firestoreHelpers';
  ```

- [ ] **Step 2**: Create room when judge starts hearing
  ```javascript
  const handleStart = async () => {
    if (role === 'judge') {
      const newRoomId = generateRoomId();
      
      await createRoom({
        roomId: newRoomId,
        hearingId: selectedCase?.id,
        caseId: selectedCase?.caseId,
        hostId: user.uid,
        status: 'active'
      });
      
      setRoomId(newRoomId);
    }
    setStage('live-session');
  };
  ```

- [ ] **Step 3**: Test room creation
  - [ ] Start a hearing as judge
  - [ ] Check Firebase Console for room document
  - [ ] Verify roomId is generated correctly

**Estimated Time**: 10 minutes

---

### File: `src/components/virtual_hearing/WaitingRoom.jsx`

- [ ] **Step 1**: Import helper functions
  ```javascript
  import { subscribeToRoom, addParticipant } from '../../lib/firestoreHelpers';
  ```

- [ ] **Step 2**: Subscribe to room updates
  ```javascript
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    if (roomId) {
      const unsubscribe = subscribeToRoom(roomId, setRoomData);
      return unsubscribe;
    }
  }, [roomId]);
  ```

- [ ] **Step 3**: Add participant when joining
  ```javascript
  useEffect(() => {
    if (roomId && user) {
      addParticipant({
        hearingId: caseData?.id,
        userId: user.uid,
        name: user.displayName,
        role: role,
        biometricVerified: true
      });
    }
  }, [roomId, user]);
  ```

- [ ] **Step 4**: Test participant tracking
  - [ ] Join as different users
  - [ ] Check Firebase Console for participant documents
  - [ ] Verify real-time updates

**Estimated Time**: 15 minutes

---

### File: `src/components/virtual_hearing/LiveRoom.jsx`

- [ ] **Step 1**: Import helper functions
  ```javascript
  import { 
    createTranscript, 
    addTranscriptEntry, 
    subscribeToTranscript,
    subscribeToParticipants 
  } from '../../lib/firestoreHelpers';
  ```

- [ ] **Step 2**: Create transcript on mount
  ```javascript
  const [transcriptId, setTranscriptId] = useState(null);

  useEffect(() => {
    if (caseData?.id) {
      createTranscript(caseData.id).then(setTranscriptId);
    }
  }, [caseData]);
  ```

- [ ] **Step 3**: Subscribe to transcript updates
  ```javascript
  const [transcript, setTranscript] = useState([]);

  useEffect(() => {
    if (caseData?.id) {
      const unsubscribe = subscribeToTranscript(caseData.id, (data) => {
        setTranscript(data.entries || []);
      });
      return unsubscribe;
    }
  }, [caseData]);
  ```

- [ ] **Step 4**: Add transcript entry function
  ```javascript
  const addEntry = async (speaker, text) => {
    if (transcriptId) {
      await addTranscriptEntry(transcriptId, {
        speaker,
        time: new Date().toLocaleTimeString(),
        text
      });
    }
  };
  ```

- [ ] **Step 5**: Test live transcription
  - [ ] Add transcript entries
  - [ ] Verify they appear in Firebase Console
  - [ ] Check real-time sync across browsers

**Estimated Time**: 20 minutes

---

## 🔄 Phase 4: Biometric Verification

### File: `src/components/virtual_hearing/Verification.jsx`

- [ ] **Step 1**: Import helper function
  ```javascript
  import { logBiometricVerification } from '../../lib/firestoreHelpers';
  ```

- [ ] **Step 2**: Log verification attempts
  ```javascript
  const handleVerification = async (type, verified, confidence) => {
    await logBiometricVerification({
      userId: user.uid,
      hearingId: caseData.id,
      verificationType: type,
      verified,
      confidence
    });

    if (verified) {
      onVerified();
    }
  };
  ```

- [ ] **Step 3**: Call on each verification
  ```javascript
  // Example for facial verification
  const verifyFace = async () => {
    // Your face detection logic
    const result = { verified: true, confidence: 0.95 };
    await handleVerification('facial', result.verified, result.confidence);
  };
  ```

- [ ] **Step 4**: Test biometric logging
  - [ ] Complete verification
  - [ ] Check Firebase Console for logs
  - [ ] Verify immutability (cannot edit)

**Estimated Time**: 10 minutes

---

## 🔄 Phase 5: Recording & Post-Hearing

### File: `src/components/virtual_hearing/PostHearing.jsx`

- [ ] **Step 1**: Import helper functions
  ```javascript
  import { createRecording, getTranscript } from '../../lib/firestoreHelpers';
  ```

- [ ] **Step 2**: Save recording metadata
  ```javascript
  const saveRecording = async (recordingUrl, duration) => {
    await createRecording({
      hearingId: caseData.id,
      caseId: caseData.caseId,
      recordingUrl,
      duration,
      checksum: null // Add SHA-256 hash if available
    });
  };
  ```

- [ ] **Step 3**: Load transcript for export
  ```javascript
  useEffect(() => {
    if (caseData?.id) {
      getTranscript(caseData.id).then(setTranscriptData);
    }
  }, [caseData]);
  ```

- [ ] **Step 4**: Test recording save
  - [ ] End a hearing
  - [ ] Verify recording metadata in Firebase
  - [ ] Export transcript

**Estimated Time**: 10 minutes

---

## 🔐 Phase 6: Deploy Security Rules (OPTIONAL)

- [ ] **Step 1**: Install Firebase CLI
  ```bash
  npm install -g firebase-tools
  ```

- [ ] **Step 2**: Login to Firebase
  ```bash
  firebase login
  ```

- [ ] **Step 3**: Initialize Firebase
  ```bash
  firebase init firestore
  ```

- [ ] **Step 4**: Deploy rules
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Step 5**: Test permissions
  - [ ] Try accessing data as different roles
  - [ ] Verify judges can create hearings
  - [ ] Verify lawyers cannot delete hearings

**Estimated Time**: 15 minutes

---

## ✅ Phase 7: Testing & Validation

- [ ] **Test Login Flow**
  - [ ] Sign up new user
  - [ ] Verify user document created
  - [ ] Check role is saved correctly

- [ ] **Test Scheduler Flow**
  - [ ] Create hearing
  - [ ] Edit hearing
  - [ ] Delete hearing
  - [ ] Verify persistence after refresh

- [ ] **Test Virtual Hearing Flow**
  - [ ] Start hearing as judge
  - [ ] Join as lawyer
  - [ ] Verify real-time participant updates
  - [ ] Check transcript sync

- [ ] **Test Biometric Flow**
  - [ ] Complete verification
  - [ ] Check logs in Firebase
  - [ ] Verify immutability

- [ ] **Test Recording Flow**
  - [ ] End hearing
  - [ ] Save recording
  - [ ] Export transcript
  - [ ] Verify audit trail

**Estimated Time**: 30 minutes

---

## 📊 Progress Tracker

| Phase | Status | Time Estimate | Completed |
|-------|--------|---------------|-----------|
| Phase 1: Setup | ✅ Complete | - | ✅ |
| Phase 2: Scheduler | 🔄 Pending | 15 min | ⬜ |
| Phase 3: Virtual Hearing | 🔄 Pending | 45 min | ⬜ |
| Phase 4: Biometric | 🔄 Pending | 10 min | ⬜ |
| Phase 5: Recording | 🔄 Pending | 10 min | ⬜ |
| Phase 6: Security Rules | 🔄 Optional | 15 min | ⬜ |
| Phase 7: Testing | 🔄 Pending | 30 min | ⬜ |

**Total Estimated Time**: ~2 hours

---

## 🎯 Quick Wins (Do These First!)

1. **Scheduler Integration** (15 min)
   - Immediate visible impact
   - Data persists across sessions
   - Easy to test

2. **Room Creation** (10 min)
   - Core functionality for virtual hearing
   - Simple implementation
   - Quick validation

3. **Biometric Logging** (10 min)
   - Compliance requirement
   - Audit trail established
   - Easy to verify

---

## 🆘 Need Help?

**Documentation**:
- Integration Guide: `FIRESTORE_INTEGRATION_GUIDE.md`
- Schema Reference: `FIRESTORE_SCHEMA_REFERENCE.md`
- Data Flow: `FIRESTORE_DATA_FLOW.md`

**Helper Functions**:
- All functions: `src/lib/firestoreHelpers.js`
- Import and use directly

**Firebase Console**:
- View data: https://console.firebase.google.com/project/mandamus-1006d/firestore
- Check security rules
- Monitor usage

---

## 🎉 Success Criteria

Your integration is complete when:

- ✅ Hearings persist after page refresh
- ✅ Multiple users can join same hearing
- ✅ Transcript updates in real-time
- ✅ Biometric logs are immutable
- ✅ Recordings are saved with metadata
- ✅ All data visible in Firebase Console

---

**Start with Phase 2 (Scheduler) - it's the quickest win! 🚀**
