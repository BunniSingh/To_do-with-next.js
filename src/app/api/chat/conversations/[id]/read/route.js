import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Message from '@/lib/models/Message';

// POST - Mark all messages in a conversation as read for the current user
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const conversationId = (await params).id;
    const userId = session.user.id;

    // Update all messages in the conversation that were not sent by the current user
    // and haven't been read by the current user yet
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        $or: [
          { 'readBy.user': { $ne: userId } },
          { 'readBy': { $exists: false } }
        ],
        status: { $in: ['sent', 'delivered'] },
      },
      {
        $addToSet: {
          readBy: {
            user: userId,
            readAt: new Date(),
          },
        },
        status: 'read',
      }
    );

    console.log(`[Chat API] Marked ${result.modifiedCount} messages as read for user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read', details: error.message },
      { status: 500 }
    );
  }
}
