import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';
import { isValidObjectId } from '@/lib/validation';
import { getSocket } from '@/lib/socketEmitter';

// DELETE - Delete a conversation (one-sided deletion)
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    const { id } = await params;

    console.log('[Conversation Delete] User:', userId, 'Conversation:', id);

    // Validate conversation ID
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Find the conversation
    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => p === userId);
    if (!isParticipant) {
      return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
    }

    // Check if already deleted by this user
    const alreadyDeleted = conversation.deletedBy.some(d => d.user === userId);
    if (alreadyDeleted) {
      return NextResponse.json({ error: 'Conversation already deleted', alreadyDeleted: true }, { status: 400 });
    }

    // Add user to deletedBy list (one-sided deletion)
    conversation.deletedBy.push({
      user: userId,
      deletedAt: new Date(),
    });
    await conversation.save();

    console.log('[Conversation Delete] Conversation marked as deleted for user:', userId);

    // Check if all participants have deleted - if so, hard delete the conversation
    const allParticipantsDeleted = conversation.participants.every(p =>
      conversation.deletedBy.some(d => d.user === p)
    );

    if (allParticipantsDeleted) {
      // Hard delete the conversation and its messages
      await Conversation.findByIdAndDelete(id);
      await Message.deleteMany({ conversation: new mongoose.Types.ObjectId(id) });
      console.log('[Conversation Delete] All participants deleted - hard deleted conversation');

      // Emit socket event to notify others
      const io = getSocket();
      if (io) {
        io.to(`user:${userId}`).emit('conversation:deleted', {
          conversationId: id,
        });
      }
    } else {
      // Emit socket event - only notify the current user
      const io = getSocket();
      if (io) {
        io.to(`user:${userId}`).emit('conversation:deleted', {
          conversationId: id,
        });
      }
    }

    return NextResponse.json({
      message: 'Conversation deleted successfully',
      conversationId: id,
    });
  } catch (error) {
    console.error('[Conversation Delete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation', details: error.message },
      { status: 500 }
    );
  }
}
