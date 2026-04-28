# 🚀 Quick Deployment Checklist

## ⚡ 5-Minute Railway Deployment

### 1. Deploy Backend (2 minutes)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `Mandamus` repository
5. Configure:
   - Root Directory: `backend`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add Environment Variables:
   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key_here
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   AWS_REGION=us-east-1
   ```
7. Click "Deploy"
8. **Copy the URL** (e.g., `https://mandamus-backend.up.railway.app`)

### 2. Update Frontend (1 minute)
1. Open `.env` file
2. Add:
   ```
   VITE_API_URL=https://mandamus-backend.up.railway.app
   ```
3. Save file

### 3. Test Locally (1 minute)
1. Run: `npm run dev`
2. Try uploading a PDF
3. Check if it works

### 4. Deploy Frontend (1 minute)
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "New Project"
4. Import `Mandamus` repository
5. Add Environment Variable:
   ```
   VITE_API_URL=https://mandamus-backend.up.railway.app
   ```
6. Click "Deploy"
7. **Done!** 🎉

---

## ✅ Verification

### Backend Health Check
```bash
curl https://your-backend-url.com/
```

Expected:
```json
{"status": "running", "service": "mandamus-summariser"}
```

### Frontend Test
1. Visit your Vercel URL
2. Login
3. Go to Summarizer
4. Upload a PDF
5. ✅ Should work!

---

## 🐛 If Something Goes Wrong

### Backend Not Working?
1. Check Railway logs
2. Verify environment variables are set
3. Check AWS credentials

### Frontend Not Connecting?
1. Check `.env` has correct backend URL
2. Check browser console for CORS errors
3. Verify backend is running

### CORS Error?
- Already fixed in code (`allow_origins=["*"]`)
- Redeploy backend if needed

---

## 📊 Cost Estimate

### Railway (Backend)
- ✅ $5 free credit/month
- ✅ Enough for development
- Upgrade: $5/month if needed

### Vercel (Frontend)
- ✅ Free forever for hobby projects
- ✅ Unlimited bandwidth
- ✅ Automatic HTTPS

### Firebase (Database)
- ✅ Free tier (Spark plan)
- ✅ 1GB storage
- ✅ 50K reads/day

### AWS (Bedrock + S3)
- Pay-as-you-go
- ~$0.01 per API call
- ~$0.023 per GB storage

**Total for Development**: ~$0-5/month

---

## 🎯 Production Checklist

- [ ] Backend deployed on Railway
- [ ] Frontend deployed on Vercel
- [ ] Environment variables set
- [ ] Health check passing
- [ ] Test upload working
- [ ] Test summarizer working
- [ ] Test precedent finder working
- [ ] Test draft generator working
- [ ] Test scheduler working
- [ ] Test virtual hearing working

---

**That's it! Your Mandamus platform is now live! 🚀**
