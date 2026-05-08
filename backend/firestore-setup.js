import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBDvjtPhhYME5-Q0qu06jZNcmt1LVACkjA",
  authDomain: "mandamus-1006d.firebaseapp.com",
  projectId: "mandamus-1006d",
  storageBucket: "mandamus-1006d.firebasestorage.app",
  messagingSenderId: "165657722232",
  appId: "1:165657722232:web:d130ee45999910088b1c8d",
  measurementId: "G-KP6YK5WM9C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeFirestore() {
  console.log('🔥 Initializing Firestore collections for Mandamus...\n');

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. USERS COLLECTION — Login & Role Management
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating users collection...');
    await setDoc(doc(db, 'users', 'sample-judge-001'), {
      displayName: 'Justice Vance',
      email: 'judge.vance@mandamus.in',
      role: 'judge',
      verified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ Sample judge user created\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 2. CASES COLLECTION — Case Management
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating cases collection...');
    const caseRef = await addDoc(collection(db, 'cases'), {
      caseId: 'CRL-08821-2024',
      caseName: 'State vs Malhotra',
      petitioner: 'State of Maharashtra',
      respondent: 'Rajesh Malhotra',
      caseType: 'Criminal',
      status: 'active',
      judgeId: 'sample-judge-001',
      filingDate: serverTimestamp(),
      nextHearingDate: null,
      summary: null,
      precedents: [],
      draft: null,
      createdAt: serverTimestamp()
    });
    console.log(`✅ Sample case created: ${caseRef.id}\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. HEARINGS COLLECTION — Scheduler & Virtual Hearing Sessions
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating hearings collection...');
    const hearingRef = await addDoc(collection(db, 'hearings'), {
      hearingId: 'HRG-' + Date.now(),
      caseId: 'CRL-08821-2024',
      caseName: 'State vs Malhotra',
      judgeId: 'sample-judge-001',
      scheduledDate: '2024-12-20',
      scheduledTime: '10:00',
      type: 'Virtual Hearing',
      status: 'scheduled',
      participants: ['sample-judge-001'],
      parties: 'State of Maharashtra · Rajesh Malhotra',
      agenda: 'Opening statements regarding cryptographic asset seizure',
      roomId: null,
      draftAttached: false,
      createdAt: serverTimestamp()
    });
    console.log(`✅ Sample hearing created: ${hearingRef.id}\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. PARTICIPANTS COLLECTION — Real-time Hearing Participants
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating participants collection...');
    await addDoc(collection(db, 'participants'), {
      participantId: 'PART-' + Date.now(),
      hearingId: hearingRef.id,
      userId: 'sample-judge-001',
      name: 'Justice Vance',
      role: 'judge',
      biometricVerified: true,
      connectionStatus: 'disconnected',
      joinedAt: null,
      streamId: null,
      createdAt: serverTimestamp()
    });
    console.log('✅ Sample participant created\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 5. SIGNALING COLLECTION — WebRTC Signaling
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating signaling collection...');
    await addDoc(collection(db, 'signaling'), {
      hearingId: hearingRef.id,
      roomId: 'abc-defg-hij',
      fromUserId: 'sample-judge-001',
      toUserId: 'sample-lawyer-001',
      type: 'offer',
      payload: {},
      timestamp: serverTimestamp()
    });
    console.log('✅ Sample signaling document created\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 6. BIOMETRIC_LOGS COLLECTION — Verification Audit Trail
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating biometric_logs collection...');
    await addDoc(collection(db, 'biometric_logs'), {
      userId: 'sample-judge-001',
      hearingId: hearingRef.id,
      verificationType: 'facial',
      verified: true,
      confidence: 0.98,
      timestamp: serverTimestamp()
    });
    console.log('✅ Sample biometric log created\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 7. HEARING_RECORDINGS COLLECTION — Immutable Audit Trail
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating hearing_recordings collection...');
    await addDoc(collection(db, 'hearing_recordings'), {
      hearingId: hearingRef.id,
      caseId: 'CRL-08821-2024',
      recordingUrl: null,
      duration: 0,
      uploadedAt: null,
      checksum: null,
      createdAt: serverTimestamp()
    });
    console.log('✅ Sample recording document created\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 8. TRANSCRIPTS COLLECTION — Live Hearing Transcripts
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating transcripts collection...');
    await addDoc(collection(db, 'transcripts'), {
      hearingId: hearingRef.id,
      entries: [
        {
          speaker: 'JUSTICE VANCE',
          time: '14:02:11',
          text: 'Counsel, you may proceed with the opening statements.',
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: serverTimestamp()
    });
    console.log('✅ Sample transcript created\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 9. ROOMS COLLECTION — Virtual Hearing Rooms
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📁 Creating rooms collection...');
    await addDoc(collection(db, 'rooms'), {
      roomId: 'abc-defg-hij',
      hearingId: hearingRef.id,
      caseId: 'CRL-08821-2024',
      hostId: 'sample-judge-001',
      status: 'waiting',
      participants: [],
      createdAt: serverTimestamp()
    });
    console.log('✅ Sample room created\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ FIRESTORE INITIALIZATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📊 Collections Created:');
    console.log('  1. users              — User authentication & roles');
    console.log('  2. cases              — Case management');
    console.log('  3. hearings           — Scheduled hearings');
    console.log('  4. participants       — Real-time participant tracking');
    console.log('  5. signaling          — WebRTC signaling');
    console.log('  6. biometric_logs     — Biometric verification audit');
    console.log('  7. hearing_recordings — Recording metadata');
    console.log('  8. transcripts        — Live transcription');
    console.log('  9. rooms              — Virtual hearing rooms');
    console.log('\n🚀 Your Mandamus platform is ready!\n');

  } catch (error) {
    console.error('❌ Error initializing Firestore:', error);
    process.exit(1);
  }
}

initializeFirestore();
