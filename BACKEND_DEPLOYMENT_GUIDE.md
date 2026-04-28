# 🚀 Backend Deployment Guide for Mandamus

## ✅ Pre-Deployment Checklist

### Backend Code Ready
- [x] No hardcoded localhost URLs
- [x] CORS configured for all origins
- [x] Port configurable via environment variable
- [x] All dependencies with specific versions
- [x] Environment variables loaded from .env
- [x] AWS credentials configured

---

## 📦 Deployment Options

### Option 1: Railway (Recommended - Easiest)

**Why Railway?**
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy environment variable management
- ✅ GitHub integration
- ✅ Supports Python/FastAPI natively

**Steps:**

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your Mandamus repository

3. **Configure Build Settings**
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key_here
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   AWS_REGION=us-east-1
   PORT=8000
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Copy the generated URL (e.g., `https://mandamus-backend.up.railway.app`)

6. **Update Frontend**
   - Update `.env` file:
   ```
   VITE_API_URL=https://mandamus-backend.up.railway.app
   ```

---

### Option 2: Render

**Steps:**

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - Name: `mandamus-backend`
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key_here
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   AWS_REGION=us-east-1
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy the URL (e.g., `https://mandamus-backend.onrender.com`)

---

### Option 3: Heroku

**Steps:**

1. **Install Heroku CLI**
   ```bash
   # Windows
   winget install Heroku.HerokuCLI
   
   # Mac
   brew tap heroku/brew && brew install heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd d:\Kishore\New_project\Mandamus
   heroku create mandamus-backend
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set AWS_ACCESS_KEY_ID=your_aws_access_key_here
   heroku config:set AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   heroku config:set AWS_REGION=us-east-1
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push heroku main
   ```

6. **Open App**
   ```bash
   heroku open
   ```

---

### Option 4: AWS EC2 (Advanced)

**Steps:**

1. **Launch EC2 Instance**
   - Go to AWS Console → EC2
   - Launch Ubuntu 22.04 instance
   - Configure security group (allow port 8000)

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv -y
   ```

4. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/Mandamus.git
   cd Mandamus/backend
   ```

5. **Create Virtual Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

6. **Create .env File**
   ```bash
   nano .env
   ```
   Add:
   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key_here
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   AWS_REGION=us-east-1
   ```

7. **Run with PM2**
   ```bash
   sudo npm install -g pm2
   pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name mandamus-backend
   pm2 save
   pm2 startup
   ```

8. **Configure Nginx (Optional)**
   ```bash
   sudo apt install nginx -y
   sudo nano /etc/nginx/sites-available/mandamus
   ```
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/mandamus /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 🔧 Post-Deployment Configuration

### Update Frontend Environment Variables

After deploying backend, update your frontend `.env`:

```env
VITE_FIREBASE_API_KEY="AIzaSyBDvjtPhhYME5-Q0qu06jZNcmt1LVACkjA"
VITE_FIREBASE_AUTH_DOMAIN="mandamus-1006d.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="mandamus-1006d"
VITE_FIREBASE_STORAGE_BUCKET="mandamus-1006d.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="165657722232"
VITE_FIREBASE_APP_ID="1:165657722232:web:d130ee45999910088b1c8d"
VITE_SIGNALING_URL="http://localhost:4000"
VITE_API_URL="https://your-backend-url.com"  # ← Add this
```

### Update API Calls in Frontend

Find all API calls in your frontend and update them to use the environment variable:

```javascript
// Before:
const response = await fetch('http://localhost:8000/summarise', {
  method: 'POST',
  body: formData
});

// After:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const response = await fetch(`${API_URL}/summarise`, {
  method: 'POST',
  body: formData
});
```

---

## 🧪 Testing Deployment

### Test Health Check
```bash
curl https://your-backend-url.com/
```

Expected response:
```json
{
  "status": "running",
  "service": "mandamus-summariser"
}
```

### Test Upload Endpoint
```bash
curl -X POST https://your-backend-url.com/upload \
  -F "file=@test.pdf"
```

### Test from Frontend
1. Update frontend `.env` with backend URL
2. Run frontend: `npm run dev`
3. Try uploading a PDF
4. Check browser console for errors

---

## 🐛 Troubleshooting

### Issue: CORS Error
**Fix**: Make sure CORS is configured to allow all origins in `main.py`:
```python
allow_origins=["*"]
```

### Issue: AWS Credentials Error
**Fix**: Verify environment variables are set correctly:
```bash
# Railway/Render
Check environment variables in dashboard

# Heroku
heroku config

# EC2
cat backend/.env
```

### Issue: Port Already in Use
**Fix**: Use environment variable for port:
```python
port = int(os.getenv("PORT", 8000))
```

### Issue: Module Not Found
**Fix**: Ensure all dependencies are in `requirements.txt`:
```bash
pip freeze > requirements.txt
```

---

## 📊 Monitoring

### Railway
- View logs: Dashboard → Logs tab
- View metrics: Dashboard → Metrics tab

### Render
- View logs: Dashboard → Logs
- View metrics: Dashboard → Metrics

### Heroku
```bash
heroku logs --tail
```

### EC2
```bash
pm2 logs mandamus-backend
pm2 monit
```

---

## 🔐 Security Best Practices

1. **Never commit .env files**
   - Already in `.gitignore`
   - Use platform environment variables

2. **Rotate AWS credentials regularly**
   - Update in AWS Console
   - Update in deployment platform

3. **Use HTTPS only**
   - Railway/Render provide automatic HTTPS
   - For EC2, use Let's Encrypt

4. **Monitor API usage**
   - Check AWS CloudWatch for Bedrock usage
   - Set up billing alerts

---

## 💰 Cost Estimates

### Railway (Free Tier)
- ✅ $5 free credit/month
- ✅ Enough for development/testing
- Upgrade: $5/month for more resources

### Render (Free Tier)
- ✅ Free for 750 hours/month
- ✅ Spins down after inactivity
- Upgrade: $7/month for always-on

### Heroku (Free Tier Removed)
- ❌ No free tier
- Minimum: $7/month

### AWS EC2
- t2.micro: ~$8/month (free tier eligible for 12 months)
- t3.small: ~$15/month

---

## ✅ Deployment Checklist

- [ ] Backend code has no hardcoded localhost
- [ ] CORS configured for production
- [ ] Environment variables set on platform
- [ ] Backend deployed and accessible
- [ ] Health check endpoint working
- [ ] Frontend updated with backend URL
- [ ] Test upload/summarise flow
- [ ] Monitor logs for errors
- [ ] Set up billing alerts

---

**Recommended: Start with Railway for easiest deployment! 🚀**
