# Firestore Collections Quick Reference

## 📋 Collection Schemas

### 1. `users`
```javascript
{
  displayName: string,
  email: string,
  role: 'judge' | 'lawyer' | 'custody' | 'clerk',
  verified: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. `cases`
```javascript
{
  caseId: string,              // e.g., "CRL-08821-2024"
  caseName: string,            // e.g., "State vs Malhotra"
  petitioner: string,
  respondent: string,
  caseType: string,            // "Criminal", "Civil", etc.
  status: 'active' | 'closed' | 'pending',
  judgeId: string,             // User ID of assigned judge
  filingDate: timestamp,
  nextHearingDate: timestamp | null,
  summary: object | null,      // From Summarizer
  precedents: array,           // From Precedent Finder
  draft: object | null,        // From Draft Generator
  createdAt: timestamp
}
```

### 3. `hearings`
```javascript
{
  hearingId: string,           // e.g., "HRG-1234567890"
  caseId: string,
  caseName: string,
  judgeId: string,
  scheduledDate: string,       // "YYYY-MM-DD"
  scheduledTime: string,       // "HH:MM"
  type: string,                // "Virtual Hearing", "In-Person", etc.
  status: 'scheduled' | 'active' | 'completed' | 'cancelled',
  participants: array,         // [userId1, userId2, ...]
  parties: string,             // "Petitioner · Respondent"
  agenda: string,
  roomId: string | null,       // Generated when hearing starts
  draftAttached: boolean,
  createdAt: timestamp
}
```

### 4. `participants`
```javascript
{
  participantId: string,       // e.g., "PART-1234567890"
  hearingId: string,
  userId: string,
  name: string,
  role: 'judge' | 'lawyer' | 'custody' | 'clerk',
  biometricVerified: boolean,
  connectionStatus: 'connected' | 'disconnected',
  joinedAt: timestamp | null,
  streamId: string | null,
  createdAt: timestamp
}
```

### 5. `signaling`
```javascript
{
  hearingId: string,
  roomId: string,
  fromUserId: string,
  toUserId: string,
  type: 'offer' | 'answer' | 'ice-candidate',
  payload: object,             // WebRTC offer/answer/candidate
  timestamp: timestamp
}
```

### 6. `biometric_logs`
```javascript
{
  userId: string,
  hearingId: string,
  verificationType: 'facial' | 'voice' | 'liveness',
  verified: boolean,
  confidence: number,          // 0.0 to 1.0
  timestamp: timestamp
}
```

### 7. `hearing_recordings`
```javascript
{
  hearingId: string,
  caseId: string,
  recordingUrl: string | null, // S3/Storage URL
  duration: number,            // seconds
  uploadedAt: timestamp | null,
  checksum: string | null,     // SHA-256 hash
  createdAt: timestamp
}
```

### 8. `transcripts`
```javascript
{
  hearingId: string,
  entries: [
    {
      speaker: string,         // e.g., "JUSTICE VANCE"
      time: string,            // "HH:MM:SS"
      text: string,
      timestamp: string        // ISO string
    }
  ],
  createdAt: timestamp
}
```

### 9. `rooms`
```javascript
{
  roomId: string,              // e.g., "abc-defg-hij"
  hearingId: string,
  caseId: string,
  hostId: string,              // Judge's user ID
  status: 'waiting' | 'active' | 'ended',
  participants: array,         // [userId1, userId2, ...]
  createdAt: timestamp
}
```

---

## 🔍 Common Queries

### Get user by ID
```javascript
const user = await getDoc(doc(db, 'users', userId));
```

### Get all hearings for a judge
```javascript
const q = query(
  collection(db, 'hearings'),
  where('judgeId', '==', judgeId),
  orderBy('scheduledDate', 'desc')
);
const hearings = await getDocs(q);
```

### Get active participants in a hearing
```javascript
const q = query(
  collection(db, 'participants'),
  where('hearingId', '==', hearingId),
  where('connectionStatus', '==', 'connected')
);
const participants = await getDocs(q);
```

### Subscribe to room updates (real-time)
```javascript
const unsubscribe = onSnapshot(
  query(collection(db, 'rooms'), where('roomId', '==', roomId)),
  (snapshot) => {
    const room = snapshot.docs[0].data();
    console.log('Room updated:', room);
  }
);
```

---

## 🎯 Usage by Component

| Component | Collections Used |
|-----------|------------------|
| AuthPage | `users` |
| Scheduler | `hearings`, `cases` |
| VirtualHearing | `rooms`, `hearings` |
| Verification | `biometric_logs` |
| WaitingRoom | `rooms`, `participants` |
| LiveRoom | `rooms`, `participants`, `transcripts`, `signaling` |
| PostHearing | `hearing_recordings`, `transcripts` |

---

## 🔐 Access Control Summary

| Collection | Read | Write | Delete |
|------------|------|-------|--------|
| users | All authenticated | Owner only | No |
| cases | All authenticated | Judges only | No |
| hearings | Participants + Judges | Judges only | Judges only |
| participants | All authenticated | Owner + Judges | Judges only |
| signaling | All authenticated | All authenticated | All authenticated |
| biometric_logs | Owner + Judges | All authenticated | No |
| hearing_recordings | All authenticated | Judges only | No |
| transcripts | All authenticated | All authenticated | Judges only |
| rooms | All authenticated | Judges create, All update | Judges only |

---

## 📊 Data Flow

```
Login (AuthPage)
    ↓
Create/Update User in `users`
    ↓
Schedule Hearing (Scheduler)
    ↓
Create Hearing in `hearings`
    ↓
Start Virtual Hearing
    ↓
Create Room in `rooms`
    ↓
Biometric Verification
    ↓
Log to `biometric_logs`
    ↓
Join Room
    ↓
Add to `participants`
    ↓
Live Session
    ↓
WebRTC via `signaling`
Real-time updates to `transcripts`
    ↓
End Hearing
    ↓
Save to `hearing_recordings`
```

---

**All collections are now live and ready to use! 🚀**
