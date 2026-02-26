// Global socket.io instance reference - attach to global to persist across hot reloads
const getGlobal = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  return {};
};

// Set the socket.io instance (called from server.js)
export function setSocketInstance(io) {
  const g = getGlobal();
  g.__socketIOInstance__ = io;
  console.log('[SocketEmitter] Socket instance registered');
}

// Get the socket.io instance
export function getSocket() {
  const g = getGlobal();
  return g.__socketIOInstance__ || null;
}

// Emit conversation created event to all participants
export function emitConversationCreated(conversation, userId) {
  const ioInstance = getSocket();

  if (!ioInstance) {
    console.warn('[SocketEmitter] No socket instance available, skipping emit');
    console.warn('[SocketEmitter] This is expected during development hot reload');
    console.warn('[SocketEmitter] The event will be sent once the socket reconnects');
    return;
  }

  console.log('[SocketEmitter] Emitting conversation:created:', conversation);
  console.log('[SocketEmitter] Participants:', conversation.participants);
  console.log('[SocketEmitter] Current user (creator):', userId);

  // Emit to each participant's personal room
  // Each participant will get the conversation with THEIR own perspective name
  conversation.participants.forEach(participant => {
    const participantId = typeof participant === 'string' ? participant : participant.id;
    const room = `user:${participantId}`;
    
    // Calculate name from this participant's perspective
    const otherParticipants = conversation.participants.filter(p => {
      const pId = typeof p === 'string' ? p : p.id;
      return pId !== participantId;
    });
    
    const perspectiveName = conversation.type === 'direct' && otherParticipants.length > 0
      ? otherParticipants.map(p => {
          const pName = typeof p === 'string' ? 'User' : (p.name || 'User');
          return pName;
        }).join(', ')
      : conversation.name;
    
    console.log('[SocketEmitter] Emitting to room:', room, 'for participant:', participantId, 'with name:', perspectiveName);

    ioInstance.to(room).emit('conversation:created', {
      conversation: {
        id: conversation.id,
        name: perspectiveName,
        type: conversation.type,
        participants: conversation.participants,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt || new Date().toISOString(),
      },
    });
  });

  console.log('[SocketEmitter] ✓✓✓ Event emitted successfully to all participants');
}
