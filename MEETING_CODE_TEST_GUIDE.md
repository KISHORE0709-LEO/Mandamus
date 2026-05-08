# 🧪 Meeting Code Feature - Quick Test Guide

## ✅ Test 1: Schedule Hearing with Code

1. **Login** as judge
2. Go to **Scheduler** tab
3. Fill in hearing details:
   - Title: "Test Hearing"
   - Date: Tomorrow
   - Time: 10:00 AM
4. Click **"SCHEDULE MEETING"**
5. ✅ **Verify**: Meeting code appears (e.g., `abc-defg-hij`)
6. ✅ **Verify**: "Copy Code" button visible
7. ✅ **Verify**: "Copy Join Link" button visible

---

## ✅ Test 2: Copy Meeting Code

1. Find scheduled meeting in list
2. Click **"Copy Code"** button (📋 icon)
3. ✅ **Verify**: Icon changes to checkmark
4. Paste somewhere (Ctrl+V)
5. ✅ **Verify**: Code is copied correctly

---

## ✅ Test 3: Copy Join Link

1. Find scheduled meeting in list
2. Click **"Copy Join Link"** button
3. ✅ **Verify**: Button text changes to "✓ Link Copied"
4. Paste somewhere (Ctrl+V)
5. ✅ **Verify**: Link format: `http://localhost:5173/hearing/abc-defg-hij`

---

## ✅ Test 4: Join by Code (Same User)

1. Go to **Virtual Hearing** tab
2. See "JOIN BY CODE" section at top
3. Enter meeting code: `abc-defg-hij`
4. Click **"JOIN"**
5. ✅ **Verify**: Proceeds to Pre-hearing screen
6. ✅ **Verify**: Case details displayed
7. Continue through verification
8. ✅ **Verify**: Reaches waiting room

---

## ✅ Test 5: Join by Dashboard (Existing Method)

1. Go to **Virtual Hearing** tab
2. See scheduled hearings in dashboard
3. Click **"Start Hearing"** (or "Join Hearing")
4. ✅ **Verify**: Proceeds to Pre-hearing screen
5. ✅ **Verify**: Same flow as join by code

---

## ✅ Test 6: Invalid Code Handling

1. Go to **Virtual Hearing** tab
2. Enter invalid code: `invalid-code`
3. Click **"JOIN"**
4. ✅ **Verify**: Error message: "Invalid code format. Use: xxx-xxxx-xxx"
5. Enter non-existent code: `aaa-bbbb-ccc`
6. Click **"JOIN"**
7. ✅ **Verify**: Alert: "Invalid meeting code. Please check and try again."

---

## ✅ Test 7: Auto-Formatting

1. Go to **Virtual Hearing** tab
2. Start typing in code input: `abc`
3. ✅ **Verify**: Dash auto-added: `abc-`
4. Continue typing: `abcdefg`
5. ✅ **Verify**: Second dash auto-added: `abc-defg-`
6. Complete: `abcdefghij`
7. ✅ **Verify**: Final format: `abc-defg-hij`

---

## ✅ Test 8: Multi-Device (Advanced)

### Device A (Judge):
1. Login as judge
2. Schedule hearing
3. Copy meeting code
4. Go to Virtual Hearing
5. Enter code and join
6. Complete verification
7. Wait in waiting room

### Device B (Lawyer):
1. Login as lawyer (different account)
2. Go to Virtual Hearing
3. Enter same meeting code
4. Click JOIN
5. Complete verification
6. ✅ **Verify**: Both users in same waiting room
7. Judge starts hearing
8. ✅ **Verify**: Both enter live session
9. ✅ **Verify**: WebRTC connection established

---

## ✅ Test 9: Firestore Verification

1. Schedule a hearing
2. Open Firebase Console
3. Go to Firestore → `hearings` collection
4. Find your hearing document
5. ✅ **Verify**: `roomId` field exists
6. ✅ **Verify**: `roomId` matches displayed code
7. ✅ **Verify**: Format is `xxx-xxxx-xxx`

---

## ✅ Test 10: End-to-End Flow

1. **Schedule**: Create hearing with code
2. **Share**: Copy code
3. **Join**: Enter code in Virtual Hearing
4. **Verify**: Complete biometric verification
5. **Wait**: Enter waiting room
6. **Start**: Judge starts hearing
7. **Live**: Enter live session
8. **Connect**: WebRTC establishes
9. **End**: Complete hearing
10. ✅ **Verify**: Entire flow works seamlessly

---

## 🐛 Common Issues & Fixes

### Issue: Code not showing
**Fix**: Refresh page, code should appear after scheduling

### Issue: "Invalid meeting code" error
**Fix**: 
- Check code format: `xxx-xxxx-xxx`
- Ensure hearing exists in Firestore
- Try copying code again

### Issue: Can't join by code
**Fix**:
- Verify you're logged in
- Check internet connection
- Ensure Firestore rules allow read access

### Issue: WebRTC not connecting
**Fix**:
- Check signaling server is running
- Verify both users have same `roomId`
- Check browser console for errors

---

## ✅ Success Criteria

All tests pass when:
- ✅ Meeting codes generate automatically
- ✅ Codes display correctly in UI
- ✅ Copy buttons work
- ✅ Join by code works
- ✅ Join by dashboard works (existing)
- ✅ Validation catches errors
- ✅ Auto-formatting works
- ✅ Multi-device connection works
- ✅ Firestore stores codes correctly
- ✅ WebRTC uses correct roomId

---

**Your meeting code feature is ready to test! 🚀**
