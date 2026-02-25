import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchUsers } from '@/lib/usersDb';
import { sanitizeString } from '@/lib/validation';

// GET - Search users to chat with
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const users = await searchUsers(sanitizeString(query), session.user.id);

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
