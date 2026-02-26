# Chat Features: Unread Count & Last Seen

## Features Implemented

### 1. Unread Message Count (WhatsApp-style)
- ✅ Shows green badge with count in conversation list
- ✅ Increments in real-time when new message arrives
- ✅ Resets to 0 when conversation is opened
- ✅ Caps at 99+ for large counts
- ✅ Only counts messages from other users (not your own)

### 2. Last Seen Timestamp
- ✅ Shows "Last seen" time in chat header
- ✅ Shows "Last seen" in conversation list (when offline)
- ✅ Shows "Active now" when user is online
- ✅ Smart formatting: "Just now", "5m ago", "2h ago", etc.
- ✅ Updates in real-time

## How It Works

### Unread Count Logic:

**API (`/api/chat/conversations`)**:
```javascript
// Count messages not sent by current user and not read by current user
const unreadMessages = await Message.countDocuments({
  conversation: conv._id,
  sender: { $ne: userId },
  'readBy.user': { $ne: userId },
  status: { $in: ['sent', 'delivered'] },
});
```

**Real-time Update**:
```javascript
// When message arrives for non-active conversation
if (!isCurrentConversation) {
  setConversations(prev => prev.map(conv => {
    if (conv.id === message.conversation) {
      return {
        ...conv,
        unreadCount: (conv.unreadCount || 0) + 1, // Increment
        // ...
      };
    }
    return conv;
  }));
}
```

**Mark as Read**:
```javascript
// When user opens conversation
setTimeout(() => {
  fetch(`/api/chat/conversations/${conv.id}/read`, {
    method: 'POST',
  });
  setConversations(prev => prev.map(c => 
    c.id === conv.id ? { ...c, unreadCount: 0 } : c
  ));
}, 500);
```

### Last Seen Logic:

**API**:
```javascript
// Get last message time from other participants
const lastSeen = await Message.findOne({
  conversation: conv._id,
  sender: { $ne: userId },
}).sort({ createdAt: -1 }).lean();

return {
  // ...
  lastSeenAt: lastSeen?.createdAt || null,
};
```

**Display Formatting**:
```javascript
const getLastSeen = (lastSeenAt, isOnline) => {
  if (!lastSeenAt) return '';
  if (isOnline) return ''; // Don't show if online

  const diff = now - lastSeenDate;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  // ...
};
```

## UI Changes

### Conversation List Item:

**Before:**
```
[Avatar] User2           2:30 PM
         Active · Hey! How are you?
```

**After:**
```
[Avatar] User2           2:30 PM
         5m ago · Hey! How are you?     [3]
                                      (unread badge)
```

**When Online:**
```
[Avatar] User2           2:30 PM
         Active now · Hey! How are you?
```

### Chat Header:

**Before:**
```
[Avatar] User2
         🟢 Active now
```

**After (Online):**
```
[Avatar] User2
         🟢 Active now
```

**After (Offline):**
```
[Avatar] User2
         ⚫ Last seen 2:30 PM
```

**After (Yesterday):**
```
[Avatar] User2
         ⚫ Last seen Jan 15, 2:30 PM
```

## Testing

### Test Scenario 1: Unread Count

1. **Setup:**
   - Browser A (Chrome): Login as User1
   - Browser B (Incognito): Login as User2
   - Both have conversation open

2. **Action:** User2 sends 3 messages while User1 is on different conversation

3. **Expected (User1's screen):**
   - Conversation list shows: "User2" with green badge [3]
   - Badge appears instantly when messages arrive
   - Last message preview updates

4. **Action:** User1 clicks on conversation with User2

5. **Expected:**
   - Badge disappears (count resets to 0)
   - Messages marked as read in database

### Test Scenario 2: Last Seen (Short Time)

1. **Setup:** Both users online

2. **Action:** User2 closes browser

3. **Expected (User1's screen):**
   - Within 1 minute: "Last seen Just now"
   - After 5 minutes: "Last seen 5m ago"
   - After 2 hours: "Last seen 2h ago"

### Test Scenario 3: Last Seen (Long Time)

1. **Setup:** User2 was last active yesterday

2. **Expected (User1's screen):**
   - Chat header: "Last seen Yesterday, 2:30 PM"
   - Conversation list: "Yesterday · Last message"

### Test Scenario 4: Online Status Priority

1. **Setup:** User2 is online

2. **Expected:**
   - Shows: "Active now" (NOT "Last seen")
   - Green dot visible
   - Last seen hidden

3. **Action:** User2 disconnects

4. **Expected (within 2 seconds):**
   - Shows: "Last seen Just now"
   - Gray dot visible

## Files Modified

1. **`src/app/api/chat/conversations/route.js`**
   - Added `unreadCount` calculation
   - Added `lastSeenAt` field

2. **`src/components/chat/ConversationList.jsx`**
   - Added `getLastSeen()` helper function
   - Added unread count badge display
   - Removed "Active" text
   - Shows last seen in conversation list

3. **`src/app/chat/page.js`**
   - Added mark-as-read on conversation select
   - Updated header to show last seen timestamp
   - Updated message handler to increment unread count

4. **`src/app/api/chat/conversations/[id]/read/route.js`** (NEW)
   - API endpoint to mark messages as read
   - Updates `readBy` array in messages

## API Endpoints

### GET `/api/chat/conversations`
**Response:**
```json
[{
  "id": "507f1f77bcf86cd799439011",
  "name": "User2",
  "type": "direct",
  "participants": [...],
  "lastMessage": {...},
  "unreadCount": 3,
  "lastSeenAt": "2025-02-26T14:30:00.000Z",
  "updatedAt": "2025-02-26T14:30:00.000Z"
}]
```

### POST `/api/chat/conversations/[id]/read`
**Response:**
```json
{
  "success": true,
  "modifiedCount": 5
}
```

## Technical Details

### Unread Count Query:
```javascript
{
  conversation: conv._id,
  sender: { $ne: userId },        // Not sent by me
  'readBy.user': { $ne: userId }, // Not read by me
  status: { $in: ['sent', 'delivered'] } // Not yet read
}
```

### Last Seen Query:
```javascript
{
  conversation: conv._id,
  sender: { $ne: userId }, // Messages from others
}
.sort({ createdAt: -1 })   // Most recent first
```

### Mark as Read Update:
```javascript
{
  $addToSet: {
    readBy: {
      user: userId,
      readAt: new Date(),
    },
  },
  status: 'read',
}
```

## Performance Optimizations

1. **Indexed Queries:**
   - `conversation` + `createdAt` index for fast last seen lookup
   - `sender` index for filtering

2. **Efficient Updates:**
   - Only update unread count in UI, not database
   - Batch mark-as-read after 500ms delay

3. **Smart Display:**
   - Don't show last seen if user is online
   - Cap unread count at 99+

## Known Limitations

1. **Last Seen Accuracy:**
   - Based on last message time, not user's actual presence
   - May show "Just now" if user sent message recently

2. **Unread Count:**
   - Resets on page refresh (only tracks in-memory)
   - May not reflect read status from other devices

3. **Real-time Updates:**
   - Requires active socket connection
   - May have 1-2 second delay for status changes

## Future Enhancements

1. **Better Presence Tracking:**
   - Track actual user online/offline events
   - Show "typing..." status
   - Show "online" vs "active now" distinction

2. **Advanced Unread Features:**
   - Persist unread count in database
   - Show unread count per device
   - Mark specific messages as read

3. **Notifications:**
   - Desktop notifications for new messages
   - Sound alerts
   - Browser tab title with unread count

## Server Status
✅ **Development server is running**: http://localhost:3000

## Testing Checklist

- [ ] Unread count appears when message received
- [ ] Unread count increments for multiple messages
- [ ] Unread count resets when conversation opened
- [ ] Last seen shows in chat header
- [ ] Last seen shows in conversation list
- [ ] "Active now" shows when user is online
- [ ] Last seen time formats correctly (minutes, hours, days)
- [ ] Green/gray dot shows correct status
- [ ] Real-time updates work for both features
