import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Message from '@/lib/models/Message';
import Conversation from '@/lib/models/Conversation';
import { isValidObjectId } from '@/lib/validation';
import { getSocket } from '@/lib/socketEmitter';

// DELETE - Delete a message (for everyone or for me)
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleteType = searchParams.get('type') || 'for-me'; // 'for-me' or 'for-everyone'

    console.log('[Message Delete] User:', userId, 'Message:', id, 'Type:', deleteType);

    // Validate message ID
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    // Find the message
    const message = await Message.findById(id);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Verify user is a participant in the conversation
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(p => p === userId);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (deleteType === 'for-everyone') {
      // Only sender can delete for everyone
      if (message.sender !== userId) {
        return NextResponse.json({ error: 'Only the sender can delete for everyone' }, { status: 403 });
      }

      // Mark as deleted
      message.isDeleted = true;
      message.content = 'This message was deleted';
      await message.save();

      console.log('[Message Delete] Message deleted for everyone');

      // Emit socket event to all participants
      const io = getSocket();
      if (io) {
        io.to(`conversation:${message.conversation}`).emit('message:deleted', {
          messageId: id,
          conversationId: message.conversation.toString(),
          deletedForEveryone: true,
        });
      }
    } else if (deleteType === 'for-me') {
      // Check if already deleted for this user
      const alreadyDeleted = message.deletedFor.some(d => d.user === userId);
      if (alreadyDeleted) {
        return NextResponse.json({ error: 'Message already deleted for you', alreadyDeleted: true }, { status: 400 });
      }

      // Add user to deletedFor list
      message.deletedFor.push({
        user: userId,
        deletedAt: new Date(),
      });
      await message.save();

      console.log('[Message Delete] Message deleted for user:', userId);

      // Check if all participants have deleted - if so, hard delete
      const allParticipantsDeleted = conversation.participants.every(p =>
        p === message.sender || message.deletedFor.some(d => d.user === p)
      );

      if (allParticipantsDeleted) {
        // Hard delete the message
        await Message.findByIdAndDelete(id);
        console.log('[Message Delete] All participants deleted - hard deleted message');

        const io = getSocket();
        if (io) {
          io.to(`conversation:${message.conversation}`).emit('message:deleted', {
            messageId: id,
            conversationId: message.conversation.toString(),
            deletedForEveryone: true,
            hardDeleted: true,
          });
        }
      } else {
        // Emit socket event - only for this user
        const io = getSocket();
        if (io) {
          io.to(`user:${userId}`).emit('message:deleted-for-me', {
            messageId: id,
            conversationId: message.conversation.toString(),
          });
        }
      }
    }

    return NextResponse.json({
      message: 'Message deleted successfully',
      messageId: id,
      deleteType,
    });
  } catch (error) {
    console.error('[Message Delete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete message', details: error.message },
      { status: 500 }
    );
  }
}
