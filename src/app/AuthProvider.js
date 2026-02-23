'use client';

import { SessionProvider } from 'next-auth/react';

export function AuthProvider({ session, children }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

export default AuthProvider;