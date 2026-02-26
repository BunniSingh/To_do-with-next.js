import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Message from '@/lib/models/Message';
import Conversation from '@/lib/models/Conversation';
import { findUserById } from '@/lib/usersDb';
import { validateMessageContent, isValidObjectId } from '@/lib/validation';

// GET - Get messages for a conversation
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    console.log('[Messages API GET] Conversation:', id, 'User:', userId);

    // Validate conversation ID
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Verify user is a participant (both stored as strings now)
    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(id),
      participants: userId, // Direct string comparison (no ObjectId conversion)
    });

    if (!conversation) {
      console.log('[Messages API GET] Conversation not found');
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Validate limit
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // Get messages
    const messages = await Message.find({
      conversation: new mongoose.Types.ObjectId(id),
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

    console.log('[Messages API GET] Found', messages.length, 'messages');

    // Format messages - handle string sender IDs by fetching user info
    const formattedMessages = await Promise.all(messages.map(async (msg) => {
      let senderInfo = null;
      
      // If sender is a string ID, fetch user info
      if (typeof msg.sender === 'string') {
        const sender = await findUserById(msg.sender);
        senderInfo = sender ? {
          _id: sender._id.toString(),
          name: sender.name,
          email: sender.email,
        } : {
          _id: msg.sender,
          name: 'Unknown',
          email: 'unknown@localhost',
        };
      } else if (msg.sender && typeof msg.sender === 'object') {
        // Sender is already populated
        senderInfo = {
          _id: msg.sender._id.toString(),
          name: msg.sender.name,
          email: msg.sender.email,
        };
      }

      return {
        id: msg._id,
        conversation: msg.conversation,
        sender: senderInfo,
        content: msg.content,
        type: msg.type,
        status: msg.status,
        createdAt: msg.createdAt,
        readBy: msg.readBy,
      };
    })).then(arr => arr.reverse()); // Reverse to show oldest first

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Send a message (also works without socket for fallback)
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    const { id } = await params;
    const { content, type = 'text' } = await request.json();

    console.log('[Messages API POST] Sending message to:', id, 'from user:', userId);

    // Validate conversation ID
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Validate message content
    const contentValidation = validateMessageContent(content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      );
    }

    // Validate message type
    const validTypes = ['text', 'image', 'file', 'system'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid message type. Must be text, image, file, or system' },
        { status: 400 }
      );
    }

    // Verify user is a participant (both stored as strings now)
    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(id),
      participants: userId, // Direct string comparison (no ObjectId conversion)
    });

    if (!conversation) {
      console.log('[Messages API POST] Conversation not found. Checking participants...');
      // Debug: Check what's in the database
      const debugConv = await Conversation.findById(id);
      if (debugConv) {
        console.log('[Messages API POST] Conversation exists:', {
          id: debugConv._id,
          participants: debugConv.participants,
          userId: userId,
          userIdType: typeof userId,
        });
      }
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Create message - store sender as STRING for consistency with session.user.id
    const messageData = {
      conversation: id,
      sender: userId, // Store as STRING to match session.user.id
      content: contentValidation.value,
      type,
      status: 'sent',
      readBy: [{ user: userId, readAt: new Date() }], // Store as STRING
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[Messages API POST] Message data:', messageData);

    const result = await Message.collection.insertOne(messageData);

    console.log('[Messages API POST] Message inserted:', result.insertedId);

    // Get the created message - populate won't work for string sender, so just get raw message
    const message = await Message.findById(result.insertedId);

    console.log('[Messages API POST] Message created:', message);

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    // Format response with sender info from session
    return NextResponse.json({
      id: message._id.toString(),
      conversation: message.conversation,
      sender: {
        _id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      content: message.content,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
