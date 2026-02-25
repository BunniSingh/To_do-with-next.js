# Chat Feature - Debug & Troubleshooting Guide

## Quick Start

### 1. Make sure `.env.local` exists
Create this file in the project root if it doesn't exist:

```bash
MONGODB_URI=mongodb://localhost:27017/myapp
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Start MongoDB
Make sure MongoDB is running:
```bash
# Local MongoDB
mongod --dbpath C:\data\db

# Or use MongoDB Atlas (cloud)
```

### 3. Start the Development Server
```bash
npm run dev
```

The server will start on:
- **App**: http://localhost:3000
- **Socket.io**: http://localhost:3000/socket.io

---

## Debug Tools

### Browser Console Debugging

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Try to create a conversation**
4. **Look for these logs:**

**Client-side logs:**
```
[Chat Page] Starting conversation: { participantIds: [...], name: "...", type: "direct" }
[Chat Page] API Response: { status: 201, data: {...} }
[SocketContext] Session status: authenticated user@email.com
[SocketContext] ✓ Socket connected: abc123xyz
```

**Server-side logs (in terminal):**
```
[Chat API] Session: { user: { id: "...", email: "..." } }
[Chat API] Creating conversation: { userId: "...", participantIds: [...], ... }
[Chat API] Conversation created: 507f1f77bcf86cd799439011
[Socket] User authenticated: John Doe 507f1f77bcf86cd799439011
```

---

### Debug Page

Visit **http://localhost:3000/chat/debug** for an interactive debugging tool.

This page allows you to:
- ✓ Verify your session
- ✓ Search for users
- ✓ Test conversation creation
- ✓ View detailed API responses
- ✓ Copy user IDs for testing

---

## Common Issues & Solutions

### Issue 1: "Failed to create conversation"

**Check the error details in this order:**

#### A. Check Browser Console
Look for the `[Chat Page] API Response` log to see the actual error.

#### B. Common Error Messages:

**"Unauthorized" or "No session found"**
- **Cause:** You're not logged in
- **Solution:** Go to `/login` and sign in

**"At least one participant is required"**
- **Cause:** No users selected
- **Solution:** Select a user from the search results

**"Invalid participant ID format"**
- **Cause:** User ID is not a valid 24-character MongoDB ObjectId
- **Solution:** Make sure you're selecting users from the search results

**"MONGODB_URI is not defined"**
- **Cause:** Missing `.env.local` file
- **Solution:** Create `.env.local` with your MongoDB connection string

**"Cannot connect to MongoDB"**
- **Cause:** MongoDB is not running
- **Solution:** Start MongoDB service

---

### Issue 2: Socket.io Not Connecting

**Check Browser Console for:**
```
[SocketContext] ✗ Socket connection error: ...
```

**Common Solutions:**

1. **Server not running**
   - Make sure `npm run dev` is running
   - Check terminal for errors

2. **Authentication failed**
   - Make sure you're logged in
   - Check `[Socket] Session: not found` in terminal

3. **CORS error**
   - Check `NEXT_PUBLIC_APP_URL` in `.env.local`
   - Should be `http://localhost:3000`

4. **Connection timeout**
   - Check if firewall is blocking port 3000
   - Try accessing http://localhost:3000/socket.io directly

---

### Issue 3: Can't Find Users in Search

**Possible Causes:**

1. **Search query too short**
   - Minimum 2 characters required
   - Try a longer search term

2. **No users in database**
   - Register more users at `/register`
   - You need at least 2 users to chat

3. **Search returns current user only**
   - The API excludes your own user from results
   - This is expected behavior

---

### Issue 4: Messages Not Sending

**Check:**

1. **Socket connection status**
   - Look for the connection indicator in the chat UI
   - Should show "Connected" (green dot)

2. **Conversation selected**
   - Make sure a conversation is open
   - Check browser console for errors

3. **Message content**
   - Message can't be empty
   - Check for network errors in Console

---

## Testing Checklist

### Basic Functionality

- [ ] Can register a new user
- [ ] Can log in successfully
- [ ] Can see the chat icon (💬) in the header
- [ ] Can open the chat page
- [ ] Socket shows "Connected" status

### Creating Conversations

- [ ] Can search for users by name/email
- [ ] Can select users from search results
- [ ] Can click "Start Conversation" button
- [ ] Conversation appears in the list
- [ ] Can see "Conversation created successfully!" toast

### Messaging

- [ ] Can type and send messages
- [ ] Messages appear in the chat
- [ ] Can see message status (✓ sent)
- [ ] Typing indicator works
- [ ] Real-time message delivery works

### Multi-User Testing

- [ ] Open two different browsers (or incognito)
- [ ] Log in as different users
- [ ] Create a conversation between them
- [ ] Send messages from both sides
- [ ] Verify real-time delivery

---

## API Endpoints Reference

### Authentication
```
POST /api/auth/register    - Register new user
POST /api/auth/signin      - Sign in
POST /api/auth/signout     - Sign out
GET  /api/auth/session     - Get current session
```

### Chat
```
GET  /api/chat/conversations              - Get all conversations
POST /api/chat/conversations              - Create conversation
GET  /api/chat/conversations/:id          - Get single conversation
GET  /api/chat/conversations/:id/messages - Get messages
POST /api/chat/conversations/:id/messages - Send message
GET  /api/chat/users/search?q=query       - Search users
```

### Example: Create Conversation
```javascript
fetch('/api/chat/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    participantIds: ['507f1f77bcf86cd799439011'],
    type: 'direct'
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Socket.io Events Reference

### Client → Server
```javascript
socket.emit('conversation:join', conversationId);
socket.emit('conversation:leave', conversationId);
socket.emit('message:send', { conversationId, content, type });
socket.emit('typing:start', conversationId);
socket.emit('typing:stop', conversationId);
socket.emit('message:deliver', { conversationId, messageIds });
```

### Server → Client
```javascript
socket.on('message:new', (message) => { ... });
socket.on('message:sent', (data) => { ... });
socket.on('typing:started', (data) => { ... });
socket.on('typing:stopped', (data) => { ... });
socket.on('messages:read', (data) => { ... });
socket.on('messages:delivered', (data) => { ... });
```

---

## Performance Tips

1. **MongoDB Indexes**
   - Already created for `participants` and `updatedAt` fields
   - Improves conversation lookup speed

2. **Socket Reconnection**
   - Automatic reconnection with 10 attempts
   - 1 second delay between attempts

3. **Message Loading**
   - Loads 50 messages at a time
   - Pagination supported via `?skip=&limit=`

---

## Need More Help?

If you're still experiencing issues:

1. **Check all logs** (browser console + terminal)
2. **Use the debug page** at `/chat/debug`
3. **Verify MongoDB connection**
4. **Ensure you have at least 2 registered users**
5. **Restart the development server**

### Collect This Information Before Asking for Help:

```
1. Error message from browser console:
   [Paste the full error here]

2. Server logs from terminal:
   [Paste the relevant logs here]

3. What you were trying to do:
   [e.g., "Create conversation with user John"]

4. Steps to reproduce:
   1. Logged in as user@example.com
   2. Searched for "john"
   3. Selected user from results
   4. Clicked "Start Conversation"
   5. Got error: "..."

5. Environment:
   - MongoDB: [local/Atlas]
   - Node version: [run: node -v]
   - Browser: [Chrome/Firefox/etc]
```

---

## Success Indicators

You'll know everything is working when you see:

**Browser Console:**
```
✓ [SocketContext] ✓ Socket connected: abc123
✓ [Chat Page] API Response: { status: 201, data: { id: "..." } }
```

**Terminal:**
```
✓ [Chat API] Conversation created: 507f1f77bcf86cd799439011
✓ [Socket] User authenticated: John Doe 507f1f77bcf86cd799439011
```

**UI:**
- ✓ Green "Connected" indicator in chat
- ✓ "Conversation created successfully!" toast
- ✓ New conversation appears in the list
- ✓ Can send and receive messages

Good luck! 🚀
