"use client";

import { Inter } from "next/font/google";
import AuthProvider from "./AuthProvider"; // default import
import { ThemeProvider } from "@/context/ThemeContext";
import { SocketProvider } from "@/context/SocketContext";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* उसी क्रम में Providers रखें जैसे RootLayout में हैं */}
        <ThemeProvider>
          <AuthProvider session={null}>   {/* session null दें, client-side fetch होगा */}
            <SocketProvider>
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <h2>कुछ गलत हो गया!</h2>
                <button onClick={() => reset()}>पुनः प्रयास करें</button>
              </div>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}