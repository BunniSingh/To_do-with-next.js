"use client";

import Link from "next/link";
import { Inter } from "next/font/google";
import AuthProvider from "./AuthProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { SocketProvider } from "@/context/SocketContext";

const inter = Inter({ subsets: ["latin"] });

export default function NotFound() {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider session={null}>
            <SocketProvider>
              <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>पेज नहीं मिला</h2>
                <Link href="/" style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: '#0070f3', 
                  color: 'white',
                  borderRadius: '5px',
                  textDecoration: 'none'
                }}>
                  होम पेज पर जाएँ
                </Link>
              </div>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}