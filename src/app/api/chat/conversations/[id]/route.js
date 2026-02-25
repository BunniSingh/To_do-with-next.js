import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import { findUserById } from '@/lib/usersDb';

// GET - Get a single conversation by ID
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    const { id } = await params;

    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(id),
      participants: new mongoose.Types.ObjectId(userId),
    })
    .populate('participants', '-password')
    .populate('lastMessage')
    .lean();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const otherParticipants = conversation.participants.filter(p => p._id.toString() !== userId);

    return NextResponse.json({
      id: conversation._id.toString(),
      name: conversation.name || otherParticipants.map(p => p.name).join(', '),
      type: conversation.type,
      participants: conversation.participants,
      lastMessage: conversation.lastMessage,
      updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a conversation
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const userId = session.user.id;
    const { id } = await params;

    const conversation = await Conversation.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      participants: new mongoose.Types.ObjectId(userId),
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
