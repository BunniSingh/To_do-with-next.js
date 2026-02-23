import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { findUserByEmail } from "./usersDb";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password", placeholder: "password" }
      },
      async authorize(credentials) {
        try {
          // Validate input
          if (!credentials?.email || !credentials?.password) {
            console.error("Missing credentials");
            return null;
          }

          // Find user by email from shared database
          const user = await findUserByEmail(credentials.email);

          if (!user) {
            console.error("User not found:", credentials.email);
            return null;
          }

          // Check if password matches
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.error("Invalid password for user:", credentials.email);
            return null;
          }

          // Return user object without password
          const { password, ...userWithoutPassword } = user;
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE, 10) || (30 * 24 * 60 * 60), // Default 30 days
  },
  debug: process.env.NODE_ENV === "development",
};