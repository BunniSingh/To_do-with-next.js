# Conversation Name Fix - Both Sides Show Correct Names

## Problem
When User1 created a conversation with User2:
- ❌ Both User1 and User2 saw "User2" name in the conversation list
- ❌ User2 should see "User1" name (the other participant's name)

## Root Cause
The API was storing the conversation name as "User2" (passed from the dialog) and returning the same name to all participants, instead of calculating the name from each user's perspective.

### Issues Found:
1. **POST /api/chat/conversations** - Returned `createdConversation.name` (stored as "User2") to everyone
2. **Socket Emitter** - Sent the same conversation name to all participants
3. **Existing conversation response** - Already had correct logic, but new conversations didn't

## Solution

### 1. Fixed POST Response (`src/app/api/chat/conversations/route.js`)

**Before:**
```javascript
const conversationResponse = {
  id: createdConversation._id.toString(),
  name: createdConversation.name, // ❌ Always "User2"
  type: createdConversation.type,
  participants: participantsWithInfo,
  // ...
};
```

**After:**
```javascript
// Calculate conversation name based on current user's perspective
const otherParticipants = participantsWithInfo.filter(p => p.id !== userId);
const conversationName = createdConversation.type === 'direct' && otherParticipants.length > 0
  ? otherParticipants.map(p => p.name).join(', ')  // ✅ "User2" for User1, "User1" for User2
  : createdConversation.name;

const conversationResponse = {
  id: createdConversation._id.toString(),
  name: conversationName, // ✅ Correct for each user
  type: createdConversation.type,
  participants: participantsWithInfo,
  // ...
};
```

### 2. Fixed Socket Emitter (`src/lib/socketEmitter.js`)

**Before:**
```javascript
// Same name sent to all participants
ioInstance.to(room).emit('conversation:created', {
  conversation: {
    id: conversation.id,
    name: conversation.name, // ❌ Same for everyone
    // ...
  },
});
```

**After:**
```javascript
// Calculate name from each participant's perspective
const otherParticipants = conversation.participants.filter(p => {
  const pId = typeof p === 'string' ? p : p.id;
  return pId !== participantId;
});

const perspectiveName = conversation.type === 'direct' && otherParticipants.length > 0
  ? otherParticipants.map(p => p.name || 'User').join(', ')  // ✅ Different for each user
  : conversation.name;

ioInstance.to(room).emit('conversation:created', {
  conversation: {
    id: conversation.id,
    name: perspectiveName, // ✅ "User2" for User1, "User1" for User2
    // ...
  },
});
```

### 3. Fixed Existing Conversation Response

Added explicit name calculation for consistency:
```javascript
const conversationName = existingConversation.type === 'direct' && otherParticipants.length > 0
  ? otherParticipants.map(p => p.name).join(', ')
  : existingConversation.name;

return NextResponse.json({
  id: existingConversation._id.toString(),
  name: conversationName, // ✅ Correct for each user
  // ...
});
```

## How It Works Now

### When User1 Creates Conversation with User2:

**User1's Perspective:**
1. User1 creates conversation → API receives request
2. API calculates: `otherParticipants = [User2]`
3. API returns: `name: "User2"`
4. User1 sees: **"User2"** ✅

**User2's Perspective (via Socket):**
1. Socket emitter calculates: `otherParticipants = [User1]` (for User2's room)
2. Socket emits: `name: "User1"`
3. User2 receives event with: `conversation.name = "User1"`
4. User2 sees: **"User1"** ✅

### When User2 Opens Existing Conversation:

**User2's Perspective:**
1. User2 fetches `/api/chat/conversations`
2. API calculates: `otherParticipants = [User1]` (for User2)
3. API returns: `name: "User1"`
4. User2 sees: **"User1"** ✅

## Testing

### Test Scenario 1: New Conversation Creation

1. **Setup:**
   - Browser A (Chrome): Login as User1 (user1@test.com)
   - Browser B (Incognito): Login as User2 (user2@test.com)

2. **Action:** User1 creates conversation with User2
   - User1 clicks "+" → Searches for "User2" → Selects → "Start Conversation"

3. **Expected Results:**
   - **User1 sees:** "User2" in conversation list ✅
   - **User2 receives:** Real-time notification with "User1" as conversation name ✅
   - **User2 sees:** "User1" in conversation list ✅

### Test Scenario 2: Existing Conversation

1. **Setup:** Conversation already exists between User1 and User2

2. **Action:** Both users refresh the page

3. **Expected Results:**
   - **User1 sees:** "User2" in conversation list ✅
   - **User2 sees:** "User1" in conversation list ✅

### Test Scenario 3: Multiple Conversations

1. **Setup:**
   - User1 creates conversation with User2
   - User1 creates conversation with User3

2. **Expected Results:**
   - **User1 sees:** "User2" and "User3" in conversation list ✅
   - **User2 sees:** "User1" in conversation list ✅
   - **User3 sees:** "User1" in conversation list ✅

## Console Logs to Verify

### User1's Browser (when creating conversation):
```
[Chat Page] Starting conversation: { participantIds: ['507f1f77bcf86cd799439012'], name: 'User2', type: 'direct' }
[Chat Page] API Response: { status: 201, data: { id: '...', name: 'User2', ... } }
[Chat Page] Conversation created/opened: { id: '...', name: 'User2', ... }
```

### User2's Browser (when receiving real-time event):
```
[SocketContext] New conversation created: { conversation: { id: '...', name: 'User1', ... } }
[Chat Page] Conversation created event: { conversation: { id: '...', name: 'User1', ... } }
[Chat Page] Adding new conversation to list: { id: '...', name: 'User1', ... }
```

### Server Logs:
```
[Chat API] Creating new conversation...
[Chat API] Conversation data: { name: 'User2', participants: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] }
[Chat API] Conversation inserted: 507f1f77bcf86cd799439013
[Chat API] Other participants: [ 'User2' ]
[Chat API] Conversation name: User2
[SocketEmitter] Emitting to room: user:507f1f77bcf86cd799439011 for participant: 507f1f77bcf86cd799439011 with name: User2
[SocketEmitter] Emitting to room: user:507f1f77bcf86cd799439012 for participant: 507f1f77bcf86cd799439012 with name: User1
```

## Files Modified

1. **`src/app/api/chat/conversations/route.js`**
   - Fixed POST response to calculate name from current user's perspective
   - Fixed existing conversation response for consistency
   - Added `userId` parameter to `emitConversationCreated` call

2. **`src/lib/socketEmitter.js`**
   - Modified `emitConversationCreated` to accept `userId` parameter
   - Calculate perspective-based name for each participant
   - Emit personalized conversation name to each user

## Technical Details

### Name Calculation Logic:

```javascript
// For each participant, calculate THEIR view of the conversation name
const otherParticipants = participants.filter(p => p.id !== currentParticipantId);

const perspectiveName = type === 'direct' && otherParticipants.length > 0
  ? otherParticipants.map(p => p.name).join(', ')
  : originalName;
```

### Example Data Flow:

```
User1 creates conversation:
  ↓
POST /api/chat/conversations (userId: User1, participantIds: [User2])
  ↓
API calculates: otherParticipants = [User2]
  ↓
Response to User1: { name: "User2" }
  ↓
Socket Emitter:
  - To User1's room: { name: "User2" }
  - To User2's room: { name: "User1" }
  ↓
User2 receives: { conversation: { name: "User1" } }
```

## Verification Checklist

- [ ] User1 creates conversation with User2 → User1 sees "User2"
- [ ] User2 receives real-time notification → User2 sees "User1"
- [ ] User2 refreshes page → User2 still sees "User1"
- [ ] User1 refreshes page → User1 still sees "User2"
- [ ] Group chat names remain unchanged (use stored name)
- [ ] Existing conversations show correct names for both users
- [ ] Socket events fire correctly for both users

## Server Status
✅ **Development server is running**: http://localhost:3000

## Notes
- This fix only affects **direct message** conversations
- Group chat names continue to use the stored name as provided
- The fix ensures each user sees the OTHER participant's name, not their own
