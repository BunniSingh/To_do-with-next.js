import { auth } from "@/lib/auth";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./AuthProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { SocketProvider } from "@/context/SocketContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Todo App with Authentication",
  description: "A secure todo application with user authentication",
};

export const viewport = "width=device-width, initial-scale=1, maximum-scale=5";

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider session={session}>
            <SocketProvider>
              {children}
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
