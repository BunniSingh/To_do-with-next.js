# Chat Feature Troubleshooting Guide

## Issue: "Failed to create conversation" error

### Possible Causes and Solutions

#### 1. **Check MongoDB Connection**
Make sure your MongoDB is running and the connection string is correct in `.env.local`:

```bash
MONGODB_URI=mongodb://localhost:27017/myapp
```

#### 2. **Check Authentication**
- Ensure you're logged in
- The user session must have a valid `user.id`

#### 3. **Check User IDs Format**
The participant IDs must be valid MongoDB ObjectIds (24-character hex strings).

#### 4. **Test the API Manually**

Open browser console and run:

```javascript
// Test 1: Check if you're authenticated
fetch('/api/auth/session').then(r => r.json()).then(console.log);

// Test 2: Search for users
fetch('/api/chat/users/search?q=test').then(r => r.json()).then(console.log);

// Test 3: Create a conversation (replace USER_ID with actual user ID)
fetch('/api/chat/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    participantIds: ['USER_ID_HERE'],
    type: 'direct'
  })
}).then(r => r.json()).then(console.log);
```

#### 5. **Check Server Logs**
Look at the terminal where `npm run dev` is running for error messages.

#### 6. **Common Errors**

**Error: "Unauthorized"**
- You're not logged in. Go to `/login` and sign in.

**Error: "At least one participant is required"**
- The `participantIds` array is empty or missing.

**Error: "Invalid ObjectId"**
- The user IDs are not valid MongoDB ObjectIds.

**Error: "MONGODB_URI is not defined"**
- You need to create a `.env.local` file with your MongoDB connection string.

### Quick Fix Steps

1. **Create `.env.local` file** in the project root:
```bash
MONGODB_URI=mongodb://localhost:27017/myapp
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

2. **Make sure MongoDB is running**:
```bash
# If using MongoDB locally
mongod --dbpath C:\data\db

# Or use MongoDB Atlas (cloud)
```

3. **Register at least 2 users** so you can chat between them

4. **Restart the dev server**:
```bash
npm run dev
```

5. **Open browser console** (F12) to see detailed error messages

### Debug Mode

Add this to your browser console to see detailed API responses:

```javascript
window.DEBUG_CHAT = true;
```

Then try creating a conversation and check the console for detailed logs.
