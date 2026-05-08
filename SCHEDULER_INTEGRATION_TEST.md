# ✅ Scheduler → Virtual Hearing Integration Test Guide

## What Was Fixed

1. **Scheduler now saves to Firebase** ✅
   - Hearings are stored in Firestore `hearings` collection
   - Data persists across page refreshes
   - Includes all hearing details (case name, date, time, parties, agenda)

2. **Virtual Hearing Dashboard fetches from Firebase** ✅
   - Loads hearings from Firestore on mount
   - Shows real scheduled hearings instead of mock data
   - Updates in real-time when new hearings are scheduled

3. **"PROCEED TO VIRTUAL HEARING" button now works** ✅
   - Saves hearing to database
   - Navigates to Virtual Hearing tab
   - Hearing appears in Dashboard for judge to start

---

## How to Test

### Step 1: Schedule a Hearing

1. **Login** as a judge (or any role)
2. Go to **Scheduler** tab
3. Fill in the form:
   - **Title**: "Hearing — Test Case"
   - **Date**: Tomorrow's date
   - **Time**: 10:00 AM
   - **Type**: Virtual Hearing
   - **Parties**: "State vs Test"
   - **Agenda**: "Test hearing"
4. Click **"SCHEDULE MEETING"**
5. ✅ You should see success message

### Step 2: Verify in Firebase Console

1. Open Firebase Console: https://console.firebase.google.com/project/mandamus-1006d/firestore
2. Navigate to **`hearings`** collection
3. ✅ You should see your hearing document with all details

### Step 3: Proceed to Virtual Hearing

1. Click **"PROCEED TO VIRTUAL HEARING"** button
2. ✅ Should navigate to Virtual Hearing tab
3. ✅ Should see your scheduled hearing in the Dashboard

### Step 4: Verify Persistence

1. **Refresh the page** (F5)
2. Go to **Scheduler** tab
3. ✅ Your scheduled hearing should still be there
4. Go to **Virtual Hearing** tab
5. ✅ Your hearing should appear in the Dashboard

### Step 5: Start the Hearing

1. In Virtual Hearing Dashboard, find your hearing
2. Click **"Start Hearing"** (or "Join Hearing" if not judge)
3. ✅ Should proceed through verification → waiting room → live session

---

## Expected Behavior

### ✅ Scheduler Tab
- Shows all hearings scheduled by the logged-in judge
- Hearings persist after page refresh
- Can delete hearings (removes from Firebase)
- "PROCEED TO VIRTUAL HEARING" button navigates to Virtual Hearing tab

### ✅ Virtual Hearing Dashboard
- Shows all hearings scheduled by the logged-in judge
- Displays hearing details (case name, time, date, status)
- "Start Hearing" button proceeds to verification
- Updates when new hearings are scheduled

### ✅ Data Flow
```
Scheduler → Firebase → Virtual Hearing Dashboard
    ↓
Schedule Hearing
    ↓
Saved to Firestore
    ↓
Appears in Dashboard
    ↓
Judge can start hearing
```

---

## Troubleshooting

### Issue: "Please login to schedule a hearing"
**Fix**: Make sure you're logged in. Go to Auth page and sign in.

### Issue: Hearings not appearing in Dashboard
**Fix**: 
1. Check Firebase Console - is the hearing saved?
2. Check browser console for errors
3. Make sure you're logged in with the same account

### Issue: "Loading hearings..." never finishes
**Fix**:
1. Check internet connection
2. Check Firebase Console for errors
3. Check browser console for errors

### Issue: Can't delete hearings
**Fix**: Make sure you're logged in as a judge (only judges can delete)

---

## What's Next

Now that Scheduler → Virtual Hearing works, you can:

1. **Add more hearing details** (participants, documents, etc.)
2. **Implement room creation** when judge starts hearing
3. **Add real-time participant tracking**
4. **Enable live transcription**
5. **Add biometric verification logging**

All the helper functions are ready in `src/lib/firestoreHelpers.js`!

---

## Code Changes Summary

### Files Modified:
1. **`src/components/Scheduler.jsx`**
   - Added Firebase imports
   - Replaced sessionStorage with Firestore
   - Added loading state
   - Integrated `createHearing()` and `getHearingsByJudge()`

2. **`src/components/virtual_hearing/Dashboard.jsx`**
   - Added Firebase imports
   - Fetches hearings from Firestore
   - Transforms data to match expected format
   - Shows loading state

3. **`src/components/virtual_hearing/VirtualHearing.css`**
   - Added loading state styles

### New Features:
- ✅ Persistent hearing storage
- ✅ Real-time data sync
- ✅ Cross-tab data sharing
- ✅ Proper error handling
- ✅ Loading states

---

**Everything is now connected! Test it out and let me know if you need any adjustments! 🚀**
