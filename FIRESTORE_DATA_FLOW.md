# Mandamus Firestore Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MANDAMUS FIRESTORE ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  USER LOGIN  │
│  (AuthPage)  │
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│  users          │  ← User profile, role, email
│  Collection     │
└─────────────────┘


┌──────────────────┐
│  CASE CREATION   │
│  (Summarizer)    │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  cases          │  ← Case details, summary, precedents, draft
│  Collection     │
└─────────────────┘


┌──────────────────┐
│  SCHEDULE        │
│  HEARING         │
│  (Scheduler)     │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  hearings       │  ← Scheduled date/time, participants, agenda
│  Collection     │
└─────────────────┘


┌──────────────────┐
│  START VIRTUAL   │
│  HEARING         │
│  (VirtualHearing)│
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  rooms          │  ← Room ID, host, status, participants
│  Collection     │
└─────────────────┘


┌──────────────────┐
│  BIOMETRIC       │
│  VERIFICATION    │
│  (Verification)  │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  biometric_logs │  ← Verification type, confidence, timestamp
│  Collection     │  ⚠️ IMMUTABLE AUDIT TRAIL
└─────────────────┘


┌──────────────────┐
│  JOIN HEARING    │
│  (WaitingRoom)   │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  participants   │  ← User ID, role, connection status
│  Collection     │  🔄 REAL-TIME UPDATES
└─────────────────┘


┌──────────────────┐
│  LIVE SESSION    │
│  (LiveRoom)      │
└──────┬───────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  signaling      │   │  transcripts    │
│  Collection     │   │  Collection     │
│                 │   │                 │
│  WebRTC offers, │   │  Live speech-   │
│  answers, ICE   │   │  to-text logs   │
│  candidates     │   │                 │
│                 │   │  🔄 REAL-TIME   │
└─────────────────┘   └─────────────────┘


┌──────────────────┐
│  END HEARING     │
│  (PostHearing)   │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  hearing_       │  ← Recording URL, duration, checksum
│  recordings     │  ⚠️ IMMUTABLE AUDIT TRAIL
│  Collection     │
└─────────────────┘
```

---

## 🔄 Real-Time Subscriptions

```
┌─────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA FLOW                       │
└─────────────────────────────────────────────────────────────┘

Judge's Browser                          Lawyer's Browser
     │                                         │
     │  subscribeToRoom(roomId)                │  subscribeToRoom(roomId)
     ├────────────────┐                        ├────────────────┐
     │                ▼                        │                ▼
     │         ┌─────────────┐                 │         ┌─────────────┐
     │         │  Firestore  │◄────────────────┼─────────│  Firestore  │
     │         │   rooms     │                 │         │   rooms     │
     │         └─────────────┘                 │         └─────────────┘
     │                │                        │                │
     │                │ onSnapshot()           │                │ onSnapshot()
     │                ▼                        │                ▼
     │         Room data updated               │         Room data updated
     │         in real-time                    │         in real-time
     │                                         │
     │  subscribeToParticipants()              │  subscribeToParticipants()
     ├────────────────┐                        ├────────────────┐
     │                ▼                        │                ▼
     │         ┌─────────────┐                 │         ┌─────────────┐
     │         │  Firestore  │◄────────────────┼─────────│  Firestore  │
     │         │participants │                 │         │participants │
     │         └─────────────┘                 │         └─────────────┘
     │                │                        │                │
     │                ▼                        │                ▼
     │         See who joined/left             │         See who joined/left
     │         in real-time                    │         in real-time
     │                                         │
     │  subscribeToTranscript()                │  subscribeToTranscript()
     ├────────────────┐                        ├────────────────┐
     │                ▼                        │                ▼
     │         ┌─────────────┐                 │         ┌─────────────┐
     │         │  Firestore  │◄────────────────┼─────────│  Firestore  │
     │         │ transcripts │                 │         │ transcripts │
     │         └─────────────┘                 │         └─────────────┘
     │                │                        │                │
     │                ▼                        │                ▼
     │         Live transcript                 │         Live transcript
     │         updates instantly               │         updates instantly
     │                                         │
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY & ACCESS CONTROL                 │
└─────────────────────────────────────────────────────────────┘

User Request
     │
     ▼
┌─────────────────┐
│ Is user         │  NO  ──► ❌ DENIED
│ authenticated?  │
└────────┬────────┘
         │ YES
         ▼
┌─────────────────┐
│ Check user role │
│ from users      │
│ collection      │
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼
    ┌────────┐         ┌────────┐        ┌────────┐        ┌────────┐
    │ JUDGE  │         │ LAWYER │        │CUSTODY │        │ CLERK  │
    └────┬───┘         └────┬───┘        └────┬───┘        └────┬───┘
         │                  │                  │                  │
         │                  │                  │                  │
    ✅ Create cases    ✅ Read cases     ✅ Read cases     ✅ Read cases
    ✅ Create hearings ✅ Join hearings  ✅ Join hearings  ✅ Observe
    ✅ Manage rooms    ✅ Participate    ✅ Participate    ✅ View only
    ✅ Delete hearings ❌ Cannot create  ❌ Cannot create  ❌ Cannot create
    ✅ Full access     ❌ Cannot delete  ❌ Cannot delete  ❌ Cannot delete
```

---

## 📊 Collection Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    COLLECTION RELATIONSHIPS                  │
└─────────────────────────────────────────────────────────────┘

users (userId)
  │
  ├──► cases (judgeId → userId)
  │      │
  │      └──► hearings (caseId → cases.caseId)
  │             │
  │             ├──► rooms (hearingId → hearings.id)
  │             │      │
  │             │      └──► participants (hearingId → hearings.id)
  │             │             │
  │             │             └──► biometric_logs (userId → users.userId)
  │             │
  │             ├──► transcripts (hearingId → hearings.id)
  │             │
  │             ├──► hearing_recordings (hearingId → hearings.id)
  │             │
  │             └──► signaling (hearingId → hearings.id)
  │
  └──► participants (userId → users.userId)
```

---

## 🎯 Component → Collection Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT USAGE MAP                       │
└─────────────────────────────────────────────────────────────┘

AuthPage.jsx
    └──► users ✍️ (write)

Scheduler.jsx
    ├──► hearings ✍️ (write)
    └──► cases 👁️ (read)

VirtualHearing.jsx
    ├──► rooms ✍️ (write)
    └──► hearings 👁️ (read)

Verification.jsx
    └──► biometric_logs ✍️ (write)

WaitingRoom.jsx
    ├──► rooms 👁️ (read, real-time)
    └──► participants ✍️ (write)

LiveRoom.jsx
    ├──► participants 👁️ (read, real-time)
    ├──► transcripts ✍️ (write, real-time)
    ├──► signaling ✍️ (write)
    └──► rooms 👁️ (read, real-time)

PostHearing.jsx
    ├──► hearing_recordings ✍️ (write)
    └──► transcripts 👁️ (read)
```

---

## 🚀 Data Flow Example: Complete Hearing Lifecycle

```
1. LOGIN
   User → AuthPage → users collection
   ✅ User authenticated, role stored

2. SCHEDULE HEARING
   Judge → Scheduler → hearings collection
   ✅ Hearing scheduled with date/time

3. START HEARING
   Judge → VirtualHearing → rooms collection
   ✅ Room created with unique ID

4. VERIFY IDENTITY
   All → Verification → biometric_logs collection
   ✅ Facial/voice verification logged

5. JOIN ROOM
   All → WaitingRoom → participants collection
   ✅ Participant added, status tracked

6. LIVE SESSION
   All → LiveRoom → Multiple collections:
   ├─► signaling (WebRTC coordination)
   ├─► transcripts (live speech-to-text)
   └─► participants (connection status)
   ✅ Real-time communication active

7. END HEARING
   Judge → PostHearing → hearing_recordings collection
   ✅ Recording saved, audit trail complete
```

---

**All data flows are now visualized! Use this as a reference when integrating. 🎯**
