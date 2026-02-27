# Deploy to Railway (Full App with Chat) ⭐ RECOMMENDED

## ✅ Why Railway?

Railway supports custom servers and Socket.io, so your **entire app works perfectly**:
- ✅ Todo CRUD operations
- ✅ Real-time chat
- ✅ Socket.io connections
- ✅ WebSocket support
- ✅ MongoDB integration
- ✅ Easy deployment

---

## Step 1: Prepare Your Project

### 1.1 Create `Procfile` (Railway uses this)

Create a file named `Procfile` (no extension) in root:

```
web: node server.js
```

### 1.2 Create `railway.json` (optional but recommended)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 1.3 Update `package.json` scripts

Ensure you have:

```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js",
    "build": "next build"
  }
}
```

---

## Step 2: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Prepare for Railway deployment"

# Create repo on GitHub
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

---

## Step 3: Deploy to Railway

### Option A: Deploy via GitHub (Recommended)

1. **Go to [Railway](https://railway.app)**
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your repository
6. Railway auto-detects Node.js and deploys!

### Option B: Deploy via CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

---

## Step 4: Configure Environment Variables

In Railway dashboard → Project → Variables, add:

```env
# MongoDB (Atlas)
MONGODB_URI=mongodb+srv://bantikumarsingh91_db_user:advanced_todo_123@cluster0.ppuk47w.mongodb.net/advanced_todo_app?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_SECRET=your-secret-key-change-this-in-production-min-32-chars
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SESSION_MAX_AGE=2592000

# App URLs
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
PORT=3000

# Node environment
NODE_ENV=production
```

**Important:**
- Generate `NEXTAUTH_SECRET`: Run `openssl rand -base64 32`
- Replace URLs with your actual Railway URL (found in dashboard)

---

## Step 5: Configure MongoDB Atlas

### 5.1 Whitelist All IPs

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. **Network Access** → **Add IP Address**
3. Select **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **Confirm**

---

## Step 6: Update Socket.io CORS (Important!)

In `server.js`, update CORS to allow Railway domain:

```javascript
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /.*\.railway\.app$/,  // Allow all Railway subdomains
].filter(Boolean);
```

---

## Step 7: Post-Deployment

### 7.1 Get Your Railway URL

1. Go to Railway dashboard
2. Click on your project
3. Click **"Settings"**
4. Find **"Domains"** section
5. Copy your URL (e.g., `https://my-app-production.up.railway.app`)

### 7.2 Update Environment Variables

Update these vars in Railway with your actual URL:
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Railway will auto-redeploy.

### 7.3 Test the App

- ✅ Visit your Railway URL
- ✅ Register/Login
- ✅ Create todos
- ✅ Open chat
- ✅ Send real-time messages
- ✅ See typing indicators
- ✅ Check online status

---

## Troubleshooting

### Build Fails
```bash
# Test build locally
npm run build

# Check for errors in build logs
railway logs
```

### Socket.io Connection Issues

Check browser console for CORS errors. Update `server.js`:

```javascript
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: true,  // Allow all origins (for testing)
    methods: ["GET", "POST"],
    credentials: true,
  },
  // ... rest of config
});
```

### App Crashes on Startup

Check logs:
```bash
railway logs
```

Common issues:
- Missing environment variables
- MongoDB connection string incorrect
- Port not set (should be 3000)

### WebSocket Not Connecting

1. Ensure you're using `https://` in production
2. Check firewall settings
3. Verify Socket.io client URL matches server

---

## Railway Pricing

- **Free tier:** $5 credit/month (enough for small apps)
- **Paid:** $5/month + usage
- **Student:** Free with GitHub Student Pack

---

## Alternative Platforms

### Render
- Similar to Railway
- Free tier available
- Deploy: https://render.com

### DigitalOcean App Platform
- More configuration options
- Starts at $5/month
- Deploy: https://digitalocean.com

### Fly.io
- Great for global deployment
- Free tier available
- Deploy: https://fly.io

---

## Production Checklist

- [ ] MongoDB Atlas IP whitelisted (0.0.0.0/0)
- [ ] All environment variables set
- [ ] `NEXTAUTH_SECRET` is 32+ characters
- [ ] URLs updated to production domain
- [ ] Socket.io CORS configured
- [ ] Test authentication flow
- [ ] Test todo CRUD operations
- [ ] Test real-time chat
- [ ] Test on mobile devices
- [ ] Check error handling

---

**Your app is now live with full chat functionality! 🎉**
