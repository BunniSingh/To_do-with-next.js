# Quick Test Guide for Real-Time Chat

## ✅ Pre-Flight Checks

### 1. Verify MongoDB is Running
```bash
# Check if MongoDB is running on default port
netstat -ano | findstr :27017
```
You should see output showing MongoDB is listening.

### 2. Verify Application Server is Running
```bash
# Check if Next.js server is running on port 3000
netstat -ano | findstr :3000
```
You should see output showing the server is listening.

### 3. Verify .env.local Exists
Check that `.env.local` file exists in project root with:
- `MONGODB_URI=mongodb://localhost:27017/myapp`
- `NEXTAUTH_SECRET=your-secret-key-min-32-chars`
- `NEXTAUTH_URL=http://localhost:3000`

## 🧪 Testing Steps

### Step 1: Register Test Users

**User 1:**
1. Go to http://localhost:3000/register
2. Name: `Test User 1`
3. Email: `user1@test.com`
4. Password: `password123`
5. Click Register

**User 2:**
1. Open an incognito/private browser window
2. Go to http://localhost:3000/register
3. Name: `Test User 2`
4. Email: `user2@test.com`
5. Password: `password123`
6. Click Register

### Step 2: Create a Conversation

**In User 1's browser:**
1. Click the chat icon (💬) in the header
2. You should see "Welcome to Chat" page
3. Click the "+" button (or "New Conversation")
4. In the search box, type "user2" or "Test User 2"
5. You should see "Test User 2" in the results
6. Click on "Test User 2" to select them
7. Click "Start Conversation"

**Expected Result:**
- Toast notification: "Conversation created successfully!"
- Conversation opens with Test User 2's name at the top
- Green dot shows "Connected" status
- Empty message list (no messages yet)

### Step 3: Send a Message (Real-Time Test)

**In User 1's browser:**
1. Type "Hello from User 1!" in the message input
2. Press Enter or click the send button
3. You should see your message appear immediately

**In User 2's browser:**
1. You should see the message appear **instantly** without refreshing
2. A notification sound may play (if implemented)
3. The conversation should appear in the conversation list

**Expected Console Logs (User 1):**
```
[SocketContext] ✓✓✓ SOCKET CONNECTED! ID: abc123
[Chat Page] Sending message: { conversationId: "...", content: "Hello from User 1!" }
[SocketContext] Emitting message:send...
[SocketContext] Message send ACK: { status: "ok", ... }
```

**Expected Console Logs (User 2):**
```
[SocketContext] ✓✓✓ SOCKET CONNECTED! ID: xyz789
[Chat Page] New message event: { _id: "...", sender: {...}, content: "Hello from User 1!" }
```

**Expected Server Logs:**
```
[Socket] === Message Send Request ===
[Socket] Conversation ID: 507f...
[Socket] User ID: 507f...
[Socket] ✓ Message created: 507f...
[Socket] Emitting message to conversation: 507f...
[Socket] ✓ Message sent successfully
```

### Step 4: Reply to the Message

**In User 2's browser:**
1. Type "Hello from User 2!" in the message input
2. Press Enter or click send
3. Message should appear in both browsers

**In User 1's browser:**
1. You should see User 2's reply appear instantly
2. Message should show User 2's avatar/name

### Step 5: Test Typing Indicators

**In User 2's browser:**
1. Click in the message input box
2. Start typing (don't send yet)

**In User 1's browser:**
1. You should see "Test User 2 typing..." appear below the user's name
2. After 2 seconds of inactivity, it should disappear

### Step 6: Test Connection Resilience

1. In one browser, close the tab
2. Reopen and log back in
3. Go to the chat page
4. You should see all previous messages
5. Send a new message - it should work normally

## 🔍 Debug Page Testing

Visit http://localhost:3000/chat/debug in your browser while logged in.

**What to check:**
1. **Session Info** - Should show your user details
2. **Socket Info** - Should show "Connected: Yes ✓"
3. **Load Conversations** - Click button, should load your conversations
4. **Send Test Message** - Select a conversation and send a test message

**Expected Logs:**
```
[Session status: authenticated]
[User: Test User 1 (507f1f77bcf86cd799439011)]
[Socket connected: abc123xyz]
[Connected status changed: true]
```

## ❌ Troubleshooting

### Problem: "Unauthorized" error
**Solution:** Make sure you're logged in. Go to /login and sign in.

### Problem: Socket shows "Disconnected" (red dot)
**Solutions:**
1. Check browser console for connection errors
2. Verify server is running: `netstat -ano | findstr :3000`
3. Check server logs for `[Socket] ✓ User authenticated`
4. Try refreshing the page

### Problem: "Failed to create conversation"
**Solutions:**
1. Check browser console for error details
2. Verify MongoDB is running: `netstat -ano | findstr :27017`
3. Check server logs for `[Chat API]` errors
4. Make sure you selected a user from search results

### Problem: Messages don't appear in real-time
**Solutions:**
1. Check both browser consoles for `[SocketContext] ✓✓✓ SOCKET CONNECTED`
2. Verify both users are in the same conversation
3. Check server logs for message send/receive events
4. Try the HTTP fallback (messages should still send via API)

### Problem: "Invalid userId format"
**Solution:** User ID must be a 24-character MongoDB ObjectId. Check that:
- User registered successfully
- Session contains valid user.id
- Database has user with proper _id format

## ✅ Success Indicators

You'll know everything is working when:

**UI Indicators:**
- ✅ Green dot in chat header
- ✅ "Active now" or "Connected" status
- ✅ Messages appear instantly in both browsers
- ✅ Typing indicators work
- ✅ Conversation list updates with last message

**Console Logs:**
```
Browser: [SocketContext] ✓✓✓ SOCKET CONNECTED!
Browser: [Chat Page] New message event: {...}
Server: [Socket] ✓ Message sent successfully
```

**Server Logs:**
```
[Socket] Initializing...
[Socket] Dev mode: Skipping DB user lookup
[Socket] Connected: abc123 (User)
[Socket] ✓ Message created
[Socket] ✓ Message sent successfully
```

## 📊 Performance Check

**Normal Latency:**
- Message send to receive: < 100ms
- Typing indicator: < 50ms
- Conversation load: < 500ms

**If slower than expected:**
1. Check MongoDB performance
2. Check network latency
3. Verify WebSocket connection (not polling)
4. Check server CPU/memory usage

---

If all tests pass, your real-time chat is working correctly! 🎉
