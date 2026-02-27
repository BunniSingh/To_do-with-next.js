# Deploy to Vercel (Todo App Only - Chat Disabled)

## ⚠️ Important Limitations

**Vercel does NOT support:**
- ❌ Custom servers (server.js)
- ❌ Socket.io real-time connections
- ❌ Long-running WebSocket connections
- ❌ Background processes

**What WILL work:**
- ✅ Todo CRUD operations
- ✅ User authentication (NextAuth)
- ✅ MongoDB database
- ✅ Static pages
- ✅ API routes (serverless)

**What WON'T work:**
- ❌ Real-time chat
- ❌ Typing indicators
- ❌ Online status
- ❌ Live message updates

---

## Step 1: Prepare Your Project

### 1.1 Update `package.json` for Vercel

Vercel needs standard Next.js scripts (not custom server):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

**Remove or rename `server.js`** - Vercel won't use it.

### 1.2 Create `vercel.json`

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

### 1.3 Update NextAuth Config for Vercel

In `src/lib/authOptions.js`, update the URL:

```javascript
export const authOptions = {
  // ... existing config
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 2592000,
  },
  // Add this for Vercel
  callbacks: {
    // ... existing callbacks
  }
};
```

---

## Step 2: Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Go to [Vercel](https://vercel.com)

1. Sign in with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Click **"Deploy"**

### 3.2 Configure Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

```
MONGODB_URI=mongodb+srv://bantikumarsingh91_db_user:advanced_todo_123@cluster0.ppuk47w.mongodb.net/advanced_todo_app?retryWrites=true&w=majority

NEXTAUTH_SECRET=your-secret-key-change-this-in-production-min-32-chars
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SESSION_MAX_AGE=2592000

NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Important:** 
- Generate a strong `NEXTAUTH_SECRET`: Run `openssl rand -base64 32` in terminal
- Replace `NEXTAUTH_URL` with your actual Vercel URL after deployment

---

## Step 4: Configure MongoDB Atlas

### 4.1 Whitelist All IPs (for Vercel serverless functions)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to **Network Access**
3. Click **"Add IP Address"**
4. Select **"Allow Access from Anywhere"** (0.0.0.0/0)
5. Click **Confirm**

---

## Step 5: Post-Deployment

### 5.1 Update NEXTAUTH_URL

After first deployment:
1. Copy your Vercel URL (e.g., `https://my-app.vercel.app`)
2. Go to Vercel → Settings → Environment Variables
3. Update `NEXTAUTH_URL` to your production URL
4. Redeploy (Vercel auto-redeploys when env vars change)

### 5.2 Test the App

- ✅ Visit your Vercel URL
- ✅ Register a new account
- ✅ Login
- ✅ Create/edit/delete todos
- ❌ Chat feature won't work (expected)

---

## Troubleshooting

### Build Fails
```bash
# Test build locally first
npm run build
```

### Authentication Not Working
- Ensure `NEXTAUTH_URL` matches your Vercel domain exactly
- Regenerate `NEXTAUTH_SECRET` (must be 32+ characters)

### Database Connection Errors
- Check MongoDB Atlas IP whitelist (should allow 0.0.0.0/0)
- Verify `MONGODB_URI` is correct
- Check database user has read/write permissions

---

## Alternative: Use Vercel + Separate Socket Server

For full chat functionality, consider:

1. **Frontend + API on Vercel**
2. **Socket.io server on Railway/Render**

This requires code changes to connect to external Socket.io server.

---

## Recommended: Deploy Full App to Railway

For the complete app with chat working, use Railway instead:

```bash
# Railway has native support for custom servers
# See: DEPLOYMENT_RAILWAY.md
```

---

**Vercel Deployment Command:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```
