# Frontend API URL Update Guide

## Files That Need Updating

After deploying your backend, you need to update API calls in these files:

### 1. **src/components/Summarizer.jsx**
Look for:
```javascript
fetch('http://localhost:8000/summarise', ...)
```

Update to:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
fetch(`${API_URL}/summarise`, ...)
```

### 2. **src/components/PrecedentFinder.jsx**
Look for:
```javascript
fetch('http://localhost:8000/precedent/search', ...)
fetch('http://localhost:8000/precedent/frequency', ...)
```

Update to:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
fetch(`${API_URL}/precedent/search`, ...)
fetch(`${API_URL}/precedent/frequency`, ...)
```

### 3. **src/components/DraftGenerator.jsx**
Look for:
```javascript
fetch('http://localhost:8000/draft/generate', ...)
fetch('http://localhost:8000/draft/validate', ...)
```

Update to:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
fetch(`${API_URL}/draft/generate`, ...)
fetch(`${API_URL}/draft/validate`, ...)
```

### 4. **src/components/Scheduler.jsx**
Look for:
```javascript
fetch('http://localhost:8000/scheduler/readiness', ...)
fetch('http://localhost:8000/scheduler/slots', ...)
fetch('http://localhost:8000/scheduler/confirm', ...)
```

Update to:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
fetch(`${API_URL}/scheduler/readiness`, ...)
fetch(`${API_URL}/scheduler/slots`, ...)
fetch(`${API_URL}/scheduler/confirm`, ...)
```

---

## Quick Find & Replace

### Using VS Code:
1. Press `Ctrl+Shift+F` (Windows) or `Cmd+Shift+F` (Mac)
2. Search for: `http://localhost:8000`
3. Review each occurrence
4. Replace with: `${API_URL}`
5. Add this line at the top of each file:
   ```javascript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
   ```

---

## Environment Variable Setup

### Development (.env)
```env
VITE_API_URL=http://localhost:8000
```

### Production (.env.production)
```env
VITE_API_URL=https://your-backend-url.com
```

---

## Automated Script (Optional)

Create `update-api-urls.js` in project root:

```javascript
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');
const files = [
  'Summarizer.jsx',
  'PrecedentFinder.jsx',
  'DraftGenerator.jsx',
  'Scheduler.jsx'
];

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add API_URL constant if not present
  if (!content.includes('const API_URL')) {
    const importEnd = content.indexOf('import') > -1 
      ? content.lastIndexOf('import') + content.substring(content.lastIndexOf('import')).indexOf(';') + 1
      : 0;
    
    const apiUrlLine = '\n\nconst API_URL = import.meta.env.VITE_API_URL || \'http://localhost:8000\';\n';
    content = content.slice(0, importEnd) + apiUrlLine + content.slice(importEnd);
  }
  
  // Replace hardcoded URLs
  content = content.replace(/['"]http:\/\/localhost:8000/g, '`${API_URL}');
  content = content.replace(/['"]/g, (match, offset) => {
    // Only replace closing quotes after API_URL
    if (content.substring(offset - 20, offset).includes('${API_URL}')) {
      return '`';
    }
    return match;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${file}`);
});

console.log('\n🎉 All files updated! Don\'t forget to update .env with your backend URL.');
```

Run with:
```bash
node update-api-urls.js
```

---

## Testing

### Test Locally
1. Keep `VITE_API_URL=http://localhost:8000` in `.env`
2. Run backend: `cd backend && python main.py`
3. Run frontend: `npm run dev`
4. Test all features

### Test Production
1. Update `.env` with production URL
2. Run frontend: `npm run dev`
3. Test all features
4. Check browser console for errors

---

## Deployment

After updating all API URLs:

1. **Commit changes**
   ```bash
   git add .
   git commit -m "Update API URLs for production"
   git push
   ```

2. **Deploy frontend** (Vercel/Netlify)
   - Set environment variable: `VITE_API_URL=https://your-backend-url.com`
   - Deploy

3. **Test production**
   - Visit your deployed frontend
   - Test all features
   - Check browser console

---

**Remember**: Always use environment variables, never hardcode URLs! 🚀
