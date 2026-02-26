// Load environment variables FIRST before any imports
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local BEFORE anything else
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log('[Server] Environment loaded:', {
  MONGODB_URI: !!process.env.MONGODB_URI,
  NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
});

// Now import the rest
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { initSocket } from "./src/lib/socket.js";
import { setSocketInstance } from "./src/lib/socketEmitter.js";
import { validateEnv } from "./src/lib/validateEnv.js";

console.log('[Socket] MONGODB_URI at import:', !!process.env.MONGODB_URI);

validateEnv();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean);

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS not allowed"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Register socket instance for use in API routes
  setSocketInstance(io);

  initSocket(io);

  const PORT = process.env.PORT || 3000;

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.io running on /socket.io`);
  });
});
