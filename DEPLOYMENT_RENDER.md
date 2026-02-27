# Deploy to Render (Free Tier) 🎉

## ✅ Why Render Free Tier?

Render offers a **free tier** that supports your full app:
- ✅ Custom servers (Socket.io works!)
- ✅ WebSocket connections
- ✅ Real-time chat
- ✅ MongoDB integration
- ✅ Auto-deploys from GitHub
- ✅ Free SSL/HTTPS

### ⚠️ Free Tier Limitations
- Web service **sleeps after 15 minutes** of inactivity
- Wakes up on next request (takes ~30 seconds)
- 750 hours/month free (enough for 1 service running 24/7)
- 512 MB RAM
- 0.5 CPU

**Perfect for:** Personal projects, testing, small apps

---

## Step 1: Prepare Your Project

### 1.1 Files Already Created
These files are already in your project:
- ✅ `Procfile` - Tells Render how to start
- ✅ `package.json` - Dependencies and scripts

### 1.2 Create `render.yaml` (Optional but Recommended)

Create a file named `render.yaml` in root:

```yaml
services:
  - type: web
    name: todo-app-with-chat
    env: node
    buildCommand: npm install && npm run build
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: MONGODB_URI
        sync: false
      - key: NEXTAUTH_SECRET
        sync: false
      - key: NEXTAUTH_URL
        sync: false
      - key: NEXT_PUBLIC_APP_URL
        sync: false
```

---

## Step 2: Push to GitHub

```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

---

## Step 3: Create Render Account

1. Go to **[https://render.com](https://render.com)**
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended) or email
4. Verify your email

---

## Step 4: Create New Web Service

### 4.1 Connect GitHub Repository

1. After login, click **"New +"** → **"Web Service"**
2. Click **"Connect GitHub"**
3. Authorize Render to access your repositories
4. Find and select your repository
5. Click **"Connect"**

### 4.2 Configure Service

Fill in the settings:

| Field | Value |
|-------|-------|
| **Name** | `todo-app-with-chat` (or your choice) |
| **Region** | Choose closest to you (e.g., Oregon, Frankfurt) |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | Leave blank |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node server.js` |

### 4.3 Choose Instance Type

Scroll down and select:
- **Instance Type:** **Free** ($0/month)

---

## Step 5: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables one by one:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://bantikumarsingh91_db_user:advanced_todo_123@cluster0.ppuk47w.mongodb.net/advanced_todo_app?retryWrites=true&w=majority

# NextAuth (generate new secret!)
NEXTAUTH_SECRET=<run-openssl-rand-base64-32>
NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SESSION_MAX_AGE=2592000

# App URLs
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
PORT=3000

# Node Environment
NODE_ENV=production
```

### Generate NEXTAUTH_SECRET

Run in terminal:
```bash
openssl rand -base64 32
```

Copy the output and paste as `NEXTAUTH_SECRET`.

**Important:** Replace `your-app-name.onrender.com` with your actual Render URL (you'll get this after deployment).

---

## Step 6: Configure MongoDB Atlas

### 6.1 Whitelist All IPs

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **"Network Access"** in left sidebar
3. Click **"Add IP Address"**
4. Click **"Allow Access from Anywhere"**
5. Click **"Confirm"**

This allows Render to connect to your database.

---

## Step 7: Deploy!

1. Click **"Create Web Service"** at bottom
2. Render will start building your app
3. Wait for deployment (2-5 minutes)
4. You'll see **"Live"** when ready
5. Click the URL to open your app!

---

## Step 8: Update URLs (Important!)

After first deployment:

### 8.1 Get Your Render URL

1. Go to Render dashboard
2. Click on your service
3. Copy the URL (e.g., `https://todo-app-with-chat.onrender.com`)

### 8.2 Update Environment Variables

1. Go to **"Environment"** tab in Render dashboard
2. Update these variables:
   - `NEXTAUTH_URL` = `https://your-app-name.onrender.com`
   - `NEXT_PUBLIC_APP_URL` = `https://your-app-name.onrender.com`
3. Click **"Save Changes"**
4. Render will auto-redeploy

---

## Step 9: Test Your App

### 9.1 First Load (Cold Start)

Free tier services sleep after 15 minutes of inactivity:
- First load may take **30-50 seconds**
- This is normal!
- Subsequent loads are instant

### 9.2 Test Features

- ✅ Visit your Render URL
- ✅ Register a new account
- ✅ Login
- ✅ Create/edit/delete todos
- ✅ Open chat (💬 icon)
- ✅ Send real-time messages
- ✅ Test typing indicators
- ✅ Check online status

---

## Troubleshooting

### Service Won't Start

Check logs in Render dashboard → **"Logs"** tab:

```bash
# Common issues:
# - Missing environment variables
# - MongoDB connection string incorrect
# - Build errors (check build logs)
# - Start command wrong (should be: node server.js)
```

### Build Fails

```bash
# Test build locally first:
npm install
npm run build

# Fix any errors shown
# Push changes to GitHub
# Render will auto-redeploy
```

### "Cannot Connect to Database"

```bash
# Check:
# 1. MONGODB_URI is correct (no typos)
# 2. MongoDB Atlas IP whitelist: 0.0.0.0/0
# 3. Database user exists and has permissions
# 4. Password is correct (reset if needed)
```

### Chat Not Working

```bash
# Check:
# 1. Socket.io server started (check logs)
# 2. Using HTTPS (not HTTP)
# 3. CORS settings in server.js allow your domain
# 4. Browser console for errors
```

### Authentication Not Working

```bash
# Check:
# 1. NEXTAUTH_URL matches Render URL exactly
# 2. NEXTAUTH_SECRET is 32+ characters
# 3. Clear browser cookies
# 4. Regenerate NEXTAUTH_SECRET
```

### Service Keeps Crashing

Check logs for errors:
```bash
# In Render dashboard → Logs
# Look for:
# - Out of memory (need more RAM)
# - Unhandled errors in code
# - Missing dependencies
```

---

## Keep Service Awake (Optional)

Free tier services sleep after 15 minutes. To keep it awake:

### Option 1: Uptime Monitoring Services

Use free uptime monitors to ping your service:

1. **[UptimeRobot](https://uptimerobot.com)** (Free)
   - Create account
   - Add new monitor
   - URL: `https://your-app.onrender.com`
   - Monitor type: HTTP(S)
   - Interval: 5 minutes

2. **[Cron-Job.org](https://cron-job.org)** (Free)
   - Similar setup
   - Ping every 5 minutes

⚠️ **Note:** This violates Render's ToS for free tier. Use at your own risk.

### Option 2: Accept the Cold Start

Just accept that first load takes ~30 seconds. For personal projects, this is usually fine.

---

## Render CLI (Optional)

You can also deploy using Render CLI:

```bash
# Install Render CLI (Linux/Mac)
curl https://render.com/install.sh | bash

# Login
render login

# Deploy
render up
```

---

## Auto-Deploy on Git Push

Render automatically deploys when you push to GitHub:

```bash
# Just push your changes
git add .
git commit -m "Fix bug"
git push

# Render will:
# 1. Detect the push
# 2. Build automatically
# 3. Deploy new version
# 4. Zero downtime!
```

---

## Production Checklist

- [ ] GitHub repo connected to Render
- [ ] All environment variables set
- [ ] `NEXTAUTH_SECRET` generated (32+ chars)
- [ ] MongoDB Atlas IP whitelisted (0.0.0.0/0)
- [ ] URLs updated to Render domain
- [ ] Build successful
- [ ] Service is "Live"
- [ ] Tested authentication
- [ ] Tested todos
- [ ] Tested chat
- [ ] Tested on mobile

---

## Upgrade Options (When You Need More)

### Render Paid Plans

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 512MB RAM, sleeps after 15min |
| **Starter** | $7/mo | 512MB RAM, no sleep |
| **Standard** | $25/mo | 2GB RAM, faster CPU |

### When to Upgrade?

- Your app gets lots of traffic
- You don't want cold starts
- You need more RAM/CPU
- Production business app

---

## Cost Calculator

### Free Tier (You)
- **Web Service:** $0/month (750 hours free)
- **Bandwidth:** Free (up to 100GB/month)
- **Total:** **$0/month** ✨

### If You Upgrade Later
- **Starter Plan:** $7/month
- **No cold starts**
- **Better for production**

---

## Alternative: Deploy Multiple Services

Render also offers:
- **PostgreSQL** (free tier available)
- **Redis** (free tier available)
- **Static Sites** (free)
- **Cron Jobs** (free)

You can add these later if needed!

---

## Support & Resources

- **[Render Docs](https://render.com/docs)**
- **[Community Forum](https://community.render.com)**
- **[Status Page](https://status.render.com)**
- **[Support](https://render.com/support)**

---

## Quick Reference

### Your Render Dashboard
https://dashboard.render.com

### Your App URL
`https://your-app-name.onrender.com`

### Logs
Dashboard → Your Service → Logs

### Environment Variables
Dashboard → Your Service → Environment

### Auto-Deploy Settings
Dashboard → Your Service → Settings

---

**Your app is now live on Render with full chat functionality! 🎉**

**First load may take 30-50 seconds (cold start), then it's instant!**

---

## Next Steps

1. ✅ Test all features
2. ✅ Share your app URL with friends
3. ✅ Monitor logs in Render dashboard
4. ✅ Enjoy your deployed app!

---

**Need help? Check the logs in Render dashboard for detailed error messages!**
