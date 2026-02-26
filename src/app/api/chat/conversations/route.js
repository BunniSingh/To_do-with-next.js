import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';
import { findUserById, searchUsers } from '@/lib/usersDb';
import { sanitizeString, isValidObjectId } from '@/lib/validation';
import { emitConversationCreated } from '@/lib/socketEmitter';

// GET - Get all conversations for the current user
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    console.log('[Chat API GET] User ID:', userId);
    console.log('[Chat API GET] User ID type:', typeof userId);

    // Find all conversations where user is a participant (both stored as strings now)
    console.log('[Chat API GET] Querying with userId string:', userId);

    const conversations = await Conversation.find({
      participants: userId, // Direct string comparison (no ObjectId conversion)
    })
    .sort({ updatedAt: -1 })
    .lean();

    console.log('[Chat API GET] Found', conversations.length, 'conversations');

    // Format conversations - fetch user info for participants
    const formattedConversations = await Promise.all(conversations.map(async conv => {
      console.log('[Chat API GET] Formatting conversation:', {
        id: conv._id,
        name: conv.name,
        type: conv.type,
        participants: conv.participants
      });

      // Fetch user info for all participants
      const participantsWithInfo = await Promise.all(conv.participants.map(async pId => {
        const user = await findUserById(pId);
        return user ? {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        } : {
          id: pId,
          name: 'Unknown',
          email: 'unknown@localhost',
        };
      }));

      // Find other participants (exclude current user)
      const otherParticipants = participantsWithInfo.filter(p => p.id !== userId);

      console.log('[Chat API GET] Other participants:', otherParticipants.map(p => p.name));

      // Conversation name: ALWAYS use other participant's name for direct messages
      const conversationName = conv.type === 'direct' && otherParticipants.length > 0
        ? otherParticipants.map(p => p.name).join(', ')
        : (conv.name || 'Unknown');

      console.log('[Chat API GET] Conversation name:', conversationName);

      // Fetch last message if exists
      let lastMessage = null;
      let unreadCount = 0;
      
      if (conv.lastMessage) {
        const lastMsg = await Message.findById(conv.lastMessage);
        if (lastMsg) {
          const sender = await findUserById(lastMsg.sender);
          lastMessage = {
            id: lastMsg._id.toString(),
            content: lastMsg.content,
            sender: sender ? {
              id: sender._id.toString(),
              name: sender.name,
            } : null,
            createdAt: lastMsg.createdAt,
          };
          
          // Calculate unread count for this user
          // Count messages not sent by current user and not read by current user
          const unreadMessages = await Message.countDocuments({
            conversation: conv._id,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId },
            status: { $in: ['sent', 'delivered'] },
          });
          unreadCount = unreadMessages;
        }
      }
      
      // Get last seen (last message time from other participants)
      const lastSeen = await Message.findOne({
        conversation: conv._id,
        sender: { $ne: userId },
      }).sort({ createdAt: -1 }).lean();

      return {
        id: conv._id.toString(),
        name: conversationName,
        type: conv.type,
        participants: participantsWithInfo,
        lastMessage,
        unreadCount,
        lastSeenAt: lastSeen?.createdAt || null,
        updatedAt: conv.updatedAt,
      };
    }));

    console.log('[Chat API GET] Returning formatted conversations:', formattedConversations.length);
    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new conversation
export async function POST(request) {
  try {
    const session = await auth();

    console.log('[Chat API] Session:', session);

    if (!session?.user?.id) {
      console.error('[Chat API] No user ID in session');
      return NextResponse.json({ error: 'Unauthorized', details: 'No session found' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Chat API] Failed to parse request body:', parseError);
      return NextResponse.json({
        error: 'Invalid request body',
        details: parseError.message
      }, { status: 400 });
    }

    const { participantIds, name, type = 'direct' } = body;

    console.log('[Chat API] Creating conversation:', { userId, participantIds, name, type });

    // Validate type
    if (!['direct', 'group'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid conversation type. Must be "direct" or "group"' },
        { status: 400 }
      );
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      console.error('[Chat API] No participant IDs provided');
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      );
    }

    // Limit participants for group chats
    if (type === 'group' && participantIds.length > 50) {
      return NextResponse.json(
        { error: 'Group chats are limited to 50 participants' },
        { status: 400 }
      );
    }

    // Validate participant IDs format
    for (const id of participantIds) {
      if (!isValidObjectId(id)) {
        console.error('[Chat API] Invalid participant ID format:', id);
        return NextResponse.json(
          { error: 'Invalid participant ID format. IDs must be 24-character MongoDB ObjectIds', received: id },
          { status: 400 }
        );
      }
    }

    // Validate conversation name if provided
    let sanitizedName = name;
    if (name) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { error: 'Conversation name must be a string' },
          { status: 400 }
        );
      }
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Conversation name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Conversation name must not exceed 100 characters' },
          { status: 400 }
        );
      }
      sanitizedName = sanitizeString(name).trim();
    }

    // For direct messages, check if conversation already exists
    if (type === 'direct' && participantIds.length === 1) {
      try {
        console.log('[Chat API] Checking for existing conversation...');
        console.log('[Chat API] userId:', userId, 'participantIds:', participantIds);

        // Check for existing conversation with same participants (both stored as strings)
        const existingConversation = await Conversation.findOne({
          type: 'direct',
          participants: {
            $all: [userId, participantIds[0]], // Direct string comparison
            $size: 2  // Ensure exactly 2 participants
          },
        })
        .lean();

        console.log('[Chat API] Existing conversation found:', existingConversation ? existingConversation._id : 'null');

        if (existingConversation) {
          // Fetch user info for participants
          const participantsWithInfo = await Promise.all(existingConversation.participants.map(async pId => {
            const user = await findUserById(pId);
            return user ? {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
            } : {
              id: pId,
              name: 'Unknown',
              email: 'unknown@localhost',
            };
          }));

          const otherParticipants = participantsWithInfo.filter(p => p.id !== userId);
          console.log('[Chat API] Returning existing conversation:', existingConversation._id);
          
          // Calculate name from current user's perspective
          const conversationName = existingConversation.type === 'direct' && otherParticipants.length > 0
            ? otherParticipants.map(p => p.name).join(', ')
            : existingConversation.name;
          
          return NextResponse.json({
            id: existingConversation._id.toString(),
            name: conversationName,
            type: existingConversation.type,
            participants: participantsWithInfo,
            updatedAt: existingConversation.updatedAt,
            message: 'Conversation already exists',
          });
        }
      } catch (findError) {
        console.error('[Chat API] Error checking existing conversation:', findError);
        throw findError;
      }
    }

    // Create new conversation - store participants as STRINGS
    console.log('[Chat API] Creating new conversation...');

    const conversationData = {
      name: sanitizedName,
      type,
      participants: [
        userId, // Store as STRING
        ...participantIds // Store as STRINGS
      ],
      createdBy: userId, // Store as STRING
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[Chat API] Conversation data:', {
      ...conversationData,
      participants: conversationData.participants
    });

    // Use MongoDB collection directly
    const result = await Conversation.collection.insertOne(conversationData);

    console.log('[Chat API] Conversation inserted:', result.insertedId);

    // Get the created conversation
    const createdConversation = await Conversation.findById(result.insertedId).lean();

    console.log('[Chat API] Conversation created successfully:', createdConversation._id);

    // Fetch user info for participants
    const participantsWithInfo = await Promise.all(createdConversation.participants.map(async pId => {
      const user = await findUserById(pId);
      return user ? {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      } : {
        id: pId,
        name: 'Unknown',
        email: 'unknown@localhost',
      };
    }));

    // Calculate conversation name based on current user's perspective
    // For direct messages, show the other participant's name
    const otherParticipants = participantsWithInfo.filter(p => p.id !== userId);
    const conversationName = createdConversation.type === 'direct' && otherParticipants.length > 0
      ? otherParticipants.map(p => p.name).join(', ')
      : createdConversation.name;

    const conversationResponse = {
      id: createdConversation._id.toString(),
      name: conversationName,
      type: createdConversation.type,
      participants: participantsWithInfo,
      createdAt: createdConversation.createdAt,
      updatedAt: createdConversation.updatedAt || new Date().toISOString(),
    };

    // Emit socket event to notify all participants about the new conversation
    emitConversationCreated(conversationResponse, userId);

    return NextResponse.json(conversationResponse, { status: 201 });
  } catch (error) {
    console.error('[Chat API] Error creating conversation:', error);
    console.error('[Chat API] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error.message },
      { status: 500 }
    );
  }
}
