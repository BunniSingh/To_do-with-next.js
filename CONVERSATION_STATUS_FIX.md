# Conversation List Online Status Fix

## Problem
The online/offline status in the **conversation list** was not updating properly:
- When User1 went offline, both User1 and User2 saw the correct status (offline) ✅
- When User2 went offline, User1 saw User2 as **"Active"** in the conversation list ❌ (but correct in chat header)

## Root Cause
The `ConversationList.jsx` component had a bug in the `getOnlineStatus` function:

```javascript
// ❌ BUG: Always returns first participant, not the "other" participant
const otherParticipant = conv.participants.find(p => {
  return true; // This just returns the first participant!
});
```

This meant:
- If User1's ID was first in the array, it checked User1's online status (always online for User1)
- The status didn't update because it was checking the wrong user

## Solution

### Fixed Logic in `ConversationList.jsx`

1. **Import `useSession`** to get current user ID:
```javascript
import { useSession } from 'next-auth/react';

export default function ConversationList({ conversations, onSelectConversation, selectedId, onNewConversation }) {
  const { data: session } = useSession();
  // ... rest of component
}
```

2. **Find the OTHER participant** (exclude current user):
```javascript
const getOnlineStatus = (conv) => {
  if (conv.type !== 'direct' || !conv.participants || !session?.user?.id) return null;

  // Find the OTHER participant (exclude current user)
  const otherParticipant = conv.participants.find(p => p.id !== session.user.id);

  if (!otherParticipant) return null;

  // Check if other participant is in online users set
  return onlineUsers.has(otherParticipant.id);
};
```

## How It Works Now

### For User1's Conversation List:
- User1 opens chat → sees conversation with User2
- `getOnlineStatus` finds participant where `id !== User1.id` → returns User2
- Checks if `onlineUsers.has(User2.id)` → shows User2's real status

### For User2's Conversation List:
- User2 opens chat → sees conversation with User1
- `getOnlineStatus` finds participant where `id !== User2.id` → returns User1
- Checks if `onlineUsers.has(User1.id)` → shows User1's real status

## Testing

### Test Scenario 1: User2 Goes Offline
1. **Setup:**
   - Browser A (Chrome): Login as User1 (user1@test.com)
   - Browser B (Firefox/Incognito): Login as User2 (user2@test.com)
   - Both users have conversation open

2. **Verify Initial State:**
   - User1 sees: User2 = 🟢 Active (green dot)
   - User2 sees: User1 = 🟢 Active (green dot)

3. **Action:** Close Browser B (User2 disconnects)

4. **Expected Result (within 1-2 seconds):**
   - User1 sees: User2 = ⚫ Offline (gray dot) in **conversation list**
   - User1 sees: User2 = ⚫ Offline (gray dot) in **chat header**

### Test Scenario 2: User2 Comes Back Online
1. **Action:** Reopen Browser B (User2 reconnects)

2. **Expected Result (within 1-2 seconds):**
   - User1 sees: User2 = 🟢 Active (green dot) in **conversation list**
   - User1 sees: User2 = 🟢 Active (green dot) in **chat header**

### Test Scenario 3: User1 Goes Offline
1. **Setup:** Both users online

2. **Action:** Close Browser A (User1 disconnects)

3. **Expected Result:**
   - User2 sees: User1 = ⚫ Offline (gray dot) in **conversation list**
   - User2 sees: User1 = ⚫ Offline (gray dot) in **chat header**

## Console Logs to Verify

### User1's Browser (when User2 goes offline):
```
[SocketContext] User offline: 507f1f77bcf86cd799439012
```

### User1's Browser (when User2 comes back online):
```
[SocketContext] User online: 507f1f77bcf86cd799439012
[SocketContext] Received online users list: ['507f1f77bcf86cd799439012']
```

### Server Logs (when User2 disconnects):
```
[Socket] Disconnected: abc123
[Socket] User 507f1f77bcf86cd799439012 is now offline
```

### Server Logs (when User2 connects):
```
[Socket] Connected: abc123 (User2)
[Socket] Sent online users list to 507f1f77bcf86cd799439012: ['507f1f77bcf86cd799439011']
[Socket] Broadcasted user:online for 507f1f77bcf86cd799439012
```

## Files Modified

1. **`src/components/chat/ConversationList.jsx`**
   - Added `useSession` import to get current user ID
   - Fixed `getOnlineStatus` to find the OTHER participant (not current user)
   - Removed unused `isUserOnline` function

## Technical Details

### Participant Array Structure:
```javascript
participants: [
  { id: '507f1f77bcf86cd799439011', name: 'User1', email: 'user1@test.com' },
  { id: '507f1f77bcf86cd799439012', name: 'User2', email: 'user2@test.com' }
]
```

### Online Users Set:
```javascript
onlineUsers: Set {
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012'
}
```

### Status Logic:
```javascript
// For User1 viewing conversation
const otherParticipant = participants.find(p => p.id !== session.user.id);
// Returns: { id: '507f1f77bcf86cd799439012', name: 'User2', ... }

const isOnline = onlineUsers.has(otherParticipant.id);
// Checks: onlineUsers.has('507f1f77bcf86cd799439012')
// Result: true if User2 is online, false if offline
```

## UI Elements Updated

### Conversation List Item:
```jsx
{/* Avatar with Online Status */}
<div className="relative">
  <div className="w-12 h-12 rounded-full ...">
    {conv.name.charAt(0).toUpperCase()}
  </div>
  {isOnline !== null && (
    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ... ${
      isOnline ? 'bg-green-500' : 'bg-gray-400'
    }`} title={isOnline ? 'Active now' : 'Offline'} />
  )}
</div>

{/* Active indicator text */}
{isOnline === true && (
  <span className="text-xs text-green-600 dark:text-green-400">• Active</span>
)}
```

## Common Issues & Solutions

### Issue: Status still shows wrong state
**Check:**
1. Browser console for `[SocketContext]` logs
2. Verify both users are in the same conversation
3. Check that `onlineUsers` Set is being updated (add console.log)

### Issue: Status doesn't update in real-time
**Check:**
1. Socket connection is active (green dot in header)
2. Server logs show `user:offline` event when user disconnects
3. Client receives `user:offline` event (check browser console)

### Issue: "Active" text appears for offline users
**Check:**
- The `isOnline === true` condition (only shows for true, not for false/null)
- Gray dot should appear for offline users

## Verification Checklist

- [ ] User1 sees User2's correct status in conversation list
- [ ] User2 sees User1's correct status in conversation list
- [ ] Status updates within 1-2 seconds when user goes offline
- [ ] Status updates within 1-2 seconds when user comes online
- [ ] Gray dot appears for offline users
- [ ] Green dot appears for online users
- [ ] "• Active" text only appears for online users
- [ ] Chat header status matches conversation list status

## Server Status
✅ **Development server is running**: http://localhost:3000
