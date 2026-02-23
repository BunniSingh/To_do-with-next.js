import { getServerSession } from "next-auth";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./AuthProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { authOptions } from "@/lib/authOptions";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Todo App with Authentication",
  description: "A secure todo application with user authentication",
};

export const viewport = "width=device-width, initial-scale=1, maximum-scale=5";

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);
  
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider session={session}>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}