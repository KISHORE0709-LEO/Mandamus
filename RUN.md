# 🚀 Mandamus Startup Guide

This document provides clear instructions on how to start all components of the Mandamus platform.

## 📋 Quick Start (One-Click Setup)

If you are using this environment, you can run the following commands in separate terminals:

### 1. Backend (Python FastAPI)
Responsible for AI analysis, document processing, and legal intelligence.
```bash
cd backend
# Make sure virtualenv is activated if needed: source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 9999 --reload
```

### 2. Signaling Server (Node.js)
Handles real-time WebRTC communication for Virtual Hearings.
```bash
cd backend/signaling
npm install
node server.js
```

### 3. Frontend (React + Vite)
The user interface dashboard.
```bash
# In the root directory
npm install
npm run dev
```

---

## 🔧 Environment Configuration

Ensure your root `.env` file contains the following URLs to connect everything correctly:

```env
VITE_API_URL="http://localhost:9999"
VITE_SIGNALING_URL="http://localhost:4000"
```

## 🛠️ Troubleshooting

- **Port Conflicts**: If port 9999 or 4000 is already in use, you can change them in the commands above and update your `.env` file accordingly.
- **Missing Dependencies**: Always run `pip install -r requirements.txt` in the `backend` folder and `npm install` in the `root` and `backend/signaling` folders after pulling new changes.
- **Database**: Ensure your AWS credentials in `backend/.env` are valid for the AI features (Summarizer, Precedent Finder) to work.

---
*Created by Antigravity AI*
