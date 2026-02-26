# Online/Offline Status Real-Time Update Fix

## Problem
The online/offline status was not updating in real-time and was always showing "offline" for all users.

## Root Cause
1. **Missing initial online users list**: When a user connected to Socket.io, they didn't receive the list of users who were already online
2. **Incomplete event handling**: The client wasn't listening to all necessary socket events for online status updates

## Solution

### 1. Server-Side Changes (`src/lib/socket.js`)

Added emission of online users list when a new user connects:

```javascript
// Send current online users list to the newly connected user
const onlineUsersList = getActiveUsers();
socket.emit('user:online:list', { userIds: onlineUsersList });
console.log(`[Socket] Sent online users list to ${socket.userId}:`, onlineUsersList);

// Notify others that user is online
socket.broadcast.emit('user:online', { userId: socket.userId });
```

**Flow:**
- When User A connects → Server sends list of currently online users (e.g., [User B, User C])
- Server broadcasts to all other users → "User A is now online"
- Other users update their UI to show User A as online

### 2. Client-Side Changes (`src/context/SocketContext.js`)

#### Added new event handler for online users list:
```javascript
const handleUserOnlineList = (data) => {
  console.log('[SocketContext] Received online users list:', data.userIds);
  setOnlineUsers(new Set(data.userIds));
};
```

#### Added individual user online handler:
```javascript
const handleUserOnline = (data) => {
  console.log('[SocketContext] User online:', data.userId);
  setOnlineUsers(prev => {
    const newSet = new Set(prev);
    newSet.add(data.userId);
    return newSet;
  });
};
```

#### Registered event listeners:
```javascript
socketInstance.on('user:online', handleUserOnline);
socketInstance.on('user:online:list', handleUserOnlineList);
```

#### Added cleanup for listeners:
```javascript
socketInstance.off('user:online');
socketInstance.off('user:online:list');
```

## How It Works Now

### Connection Flow:
1. **User connects** → Socket.io authenticates the user
2. **Server emits `user:online:list`** → Sends array of all currently online user IDs
3. **Client updates state** → `onlineUsers` Set is populated with online user IDs
4. **Server broadcasts `user:online`** → All other users are notified
5. **Other clients update** → Each client adds the new user to their online users set

### Disconnection Flow:
1. **User disconnects** → Socket.io detects disconnect
2. **Server removes user from active users** → If no more connections, user is offline
3. **Server emits `user:offline`** → All clients are notified
4. **Clients update** → Each client removes the user from their online users set

## Testing

### Steps to Verify:
1. **Start MongoDB**: `mongod --dbpath C:\data\db`
2. **Start dev server**: `npm run dev`
3. **Open Browser A** (Chrome):
   - Register/login as user1@test.com
   - Navigate to chat page
   - Open browser console to see logs
4. **Open Browser B** (Incognito/Firefox):
   - Register/login as user2@test.com
   - Navigate to chat page
   - Open browser console to see logs
5. **Check online status**:
   - In Browser A: User 2 should show as online (green dot)
   - In Browser B: User 1 should show as online (green dot)
6. **Test real-time updates**:
   - Close Browser B
   - In Browser A: User 2 should show as offline (gray dot) within 1-2 seconds
   - Reopen Browser B
   - In Browser A: User 2 should show as online again

### Expected Console Logs:

**Server (Terminal):**
```
[Socket] Connected: abc123 (User)
[Socket] Sent online users list to 507f1f77bcf86cd799439011: [ '507f1f77bcf86cd799439012' ]
[Socket] Broadcasted user:online for 507f1f77bcf86cd799439011
[Socket] Disconnected: abc123
[Socket] User 507f1f77bcf86cd799439011 is now offline
```

**Client (Browser Console):**
```
[SocketContext] ✓✓✓ SOCKET CONNECTED! ID: abc123
[SocketContext] Received online users list: [ '507f1f77bcf86cd799439012' ]
[SocketContext] User online: 507f1f77bcf86cd799439012
[SocketContext] User offline: 507f1f77bcf86cd799439012
```

## Files Modified

1. **`src/lib/socket.js`**
   - Added `user:online:list` event emission on connect
   - Improved logging for online status events

2. **`src/context/SocketContext.js`**
   - Added `handleUserOnlineList` function
   - Added `handleUserOnline` function
   - Registered `user:online` and `user:online:list` listeners
   - Added cleanup for new listeners
   - Fixed duplicate function declaration issue by using inline handlers for socket reuse

## Technical Details

### Data Structure:
- `onlineUsers`: React state as `Set<string>` for O(1) lookup
- User IDs are stored as MongoDB ObjectId strings (24-character hex)

### Event Names:
- `user:online:list` - Sent once on connection with all online users
- `user:online` - Broadcast when a user comes online
- `user:offline` - Broadcast when a user goes offline

### Performance:
- Uses `Set` for efficient add/delete operations
- Minimal network traffic (only user IDs, not full user objects)
- Events only triggered on actual status changes

## Additional Improvements

### Debugging Tips:
If status still doesn't update:
1. Check browser console for `[SocketContext]` logs
2. Check server terminal for `[Socket]` logs
3. Verify Socket.io connection is established (green dot in chat header)
4. Ensure both users are logged in with different accounts
5. Check that MongoDB is running and users exist in database

### Future Enhancements:
- Show "last seen" timestamp for offline users
- Add typing indicator persistence
- Show connection quality indicator
- Add "reconnecting" state during network issues

## Server Status
✅ **Development server is running**: http://localhost:3000
