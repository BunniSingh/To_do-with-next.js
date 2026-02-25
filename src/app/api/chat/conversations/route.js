import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';
import { findUserById, searchUsers } from '@/lib/usersDb';
import { sanitizeString, isValidObjectId } from '@/lib/validation';

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

    // Find all conversations where user is a participant
    // participants are stored as ObjectIds in database
    const userIdObj = new mongoose.Types.ObjectId(userId);
    console.log('[Chat API GET] Querying with ObjectId:', userIdObj.toString());
    
    const conversations = await Conversation.find({
      participants: userIdObj,
    })
    .populate('participants', '-password')
    .populate('lastMessage')
    .sort({ updatedAt: -1 })
    .lean();

    console.log('[Chat API GET] Found', conversations.length, 'conversations');
    console.log('[Chat API GET] Conversations:', conversations.map(c => ({ id: c._id, name: c.name, participants: c.participants.map(p => p.name) })));

    // Format conversations
    const formattedConversations = conversations.map(conv => {
      console.log('[Chat API GET] Formatting conversation:', {
        id: conv._id,
        name: conv.name,
        type: conv.type,
        participants: conv.participants.map(p => ({ id: p._id, name: p.name }))
      });
      
      // Find other participants (exclude current user)
      const otherParticipants = conv.participants.filter(p => {
        const participantId = p._id ? p._id.toString() : p.toString();
        return participantId !== userId;
      });

      console.log('[Chat API GET] Other participants:', otherParticipants.map(p => p.name));

      // Conversation name: ALWAYS use other participant's name for direct messages
      // Don't use conv.name for direct messages
      const conversationName = conv.type === 'direct' && otherParticipants.length > 0
        ? otherParticipants.map(p => p.name).join(', ')
        : (conv.name || 'Unknown');

      console.log('[Chat API GET] Conversation name:', conversationName);

      return {
        id: conv._id.toString(),
        name: conversationName,
        type: conv.type,
        participants: conv.participants.map(p => ({
          id: p._id.toString(),
          name: p.name,
          email: p.email,
        })),
        lastMessage: conv.lastMessage ? {
          id: conv.lastMessage._id.toString(),
          content: conv.lastMessage.content,
          sender: conv.lastMessage.sender ? {
            id: conv.lastMessage.sender._id?.toString() || conv.lastMessage.sender.id,
            name: conv.lastMessage.sender.name,
          } : null,
          createdAt: conv.lastMessage.createdAt,
        } : null,
        updatedAt: conv.updatedAt,
      };
    });

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
        
        const userIdObj = new mongoose.Types.ObjectId(userId);
        const participantIdObj = new mongoose.Types.ObjectId(participantIds[0]);
        
        // Check for existing conversation with same participants (regardless of order)
        const existingConversation = await Conversation.findOne({
          type: 'direct',
          participants: {
            $all: [userIdObj, participantIdObj],
            $size: 2  // Ensure exactly 2 participants
          },
        })
        .populate('participants', '-password')
        .lean();

        console.log('[Chat API] Existing conversation found:', existingConversation ? existingConversation._id : 'null');

        if (existingConversation) {
          const otherParticipants = existingConversation.participants.filter(p => p._id.toString() !== userId);
          console.log('[Chat API] Returning existing conversation:', existingConversation._id);
          return NextResponse.json({
            id: existingConversation._id.toString(),
            name: otherParticipants.map(p => p.name).join(', '),
            type: existingConversation.type,
            participants: existingConversation.participants.map(p => ({
              id: p._id.toString(),
              name: p.name,
              email: p.email,
            })),
            updatedAt: existingConversation.updatedAt,
            message: 'Conversation already exists',
          });
        }
      } catch (findError) {
        console.error('[Chat API] Error checking existing conversation:', findError);
        throw findError;
      }
    }

    // Create new conversation - store participants as ObjectIds
    console.log('[Chat API] Creating new conversation...');

    const conversationData = {
      name: sanitizedName,
      type,
      participants: [
        new mongoose.Types.ObjectId(userId),
        ...participantIds.map(id => new mongoose.Types.ObjectId(id))
      ],
      createdBy: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[Chat API] Conversation data:', {
      ...conversationData,
      participants: conversationData.participants.map(p => p.toString())
    });

    // Use MongoDB collection directly
    const result = await Conversation.collection.insertOne(conversationData);

    console.log('[Chat API] Conversation inserted:', result.insertedId);

    // Get the created conversation with populated data
    const createdConversation = await Conversation.findById(result.insertedId)
      .populate('participants', '-password');

    console.log('[Chat API] Conversation created successfully:', createdConversation._id);

    return NextResponse.json({
      id: createdConversation._id.toString(),
      name: createdConversation.name,
      type: createdConversation.type,
      participants: createdConversation.participants.map(p => ({
        id: p._id.toString(),
        name: p.name,
        email: p.email,
      })),
      createdAt: createdConversation.createdAt,
    }, { status: 201 });
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
