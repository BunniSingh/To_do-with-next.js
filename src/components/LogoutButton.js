import { signOut } from "next-auth/react";

export default function Logout() {
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <button onClick={handleSignOut}>Sign out</button>
  );
}