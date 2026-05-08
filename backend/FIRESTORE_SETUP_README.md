# Firestore Setup for Mandamus

This script initializes all necessary Firestore collections for the Mandamus Judicial AI Platform.

## Collections Created

1. **users** — User authentication & role management (judge, lawyer, custody, clerk)
2. **cases** — Case management and metadata
3. **hearings** — Scheduled hearing sessions
4. **participants** — Real-time participant tracking during hearings
5. **signaling** — WebRTC signaling for peer-to-peer connections
6. **biometric_logs** — Biometric verification audit trail (immutable)
7. **hearing_recordings** — Recording metadata and checksums (immutable)
8. **transcripts** — Live hearing transcription logs
9. **rooms** — Virtual hearing room management

## How to Run

### Step 1: Install Dependencies
```bash
cd backend
npm install firebase
```

### Step 2: Run the Setup Script
```bash
node firestore-setup.js
```

### Step 3: Deploy Security Rules (Optional)
If you want to deploy the security rules to Firebase:

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init firestore
```

4. Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

## What Happens

The script will:
- ✅ Create all 9 collections with sample data
- ✅ Set up proper document structure
- ✅ Add sample users, cases, and hearings
- ✅ Initialize WebRTC signaling infrastructure
- ✅ Create biometric verification logs
- ✅ Set up transcript and recording collections

## Security Rules

The `firestore.rules` file contains comprehensive security rules:
- **Users**: Can read all, write own profile
- **Cases**: Judges can create/update, all can read
- **Hearings**: Judges manage, participants can read
- **Signaling**: All authenticated users (temporary data)
- **Biometric Logs**: Immutable audit trail
- **Recordings**: Immutable, judges create

## Integration with Your App

After running this script, your app will automatically work with these collections:

### Login (AuthPage.jsx)
- Writes to `users` collection on signup/signin
- Stores user role (judge, lawyer, custody, clerk)

### Scheduler (Scheduler.jsx)
- Reads/writes to `hearings` collection
- Links to `cases` collection

### Virtual Hearing (VirtualHearing.jsx)
- Uses `rooms` collection for room management
- Uses `participants` for tracking attendees
- Uses `signaling` for WebRTC coordination
- Uses `biometric_logs` for verification
- Uses `transcripts` for live transcription
- Uses `hearing_recordings` for audit trail

## Troubleshooting

If you get permission errors:
1. Make sure you're using the correct Firebase config
2. Check that Firestore is enabled in your Firebase console
3. Verify your Firebase project ID matches

If collections aren't created:
1. Check your internet connection
2. Verify Firebase credentials are correct
3. Check the console for specific error messages

## Next Steps

After running this setup:
1. ✅ Collections are ready
2. ✅ Sample data is populated
3. ✅ Your app can now use Firestore
4. 🚀 Test login, scheduler, and virtual hearing features

---

**Note**: This script uses the Firebase config from your codebase. Make sure it matches your Firebase project.
