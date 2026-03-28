import mongoose from "mongoose";
import dbConnect from "./mongodb.js";
import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";
import { findUserById } from "./usersDb.js";
import dotenv from "dotenv";

const activeUsers = new Map();
const socketToUser = new Map();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export function initSocket(io) {
  console.log("[Socket] Initializing...");

  // 🔐 Auth Middleware - Simplified for development
  io.use(async (socket, next) => {
    try {
      const { userId } = socket.handshake.auth;

      if (!userId || !isValidObjectId(userId)) {
        console.warn("[Socket] Invalid userId format:", userId);
        return next(new Error("Invalid or missing userId"));
      }

      // In development, skip DB lookup - trust next-auth authentication
      // In production, you should validate the user exists
      if (process.env.NODE_ENV === "development") {
        console.log("[Socket] Dev mode: Skipping DB user lookup for:", userId);
        socket.userId = userId;
        socket.user = {
          id: userId,
          name: "User",
          email: "user@localhost",
        };
        return next();
      }

      // Production: validate user exists in database
      await dbConnect();
      const user = await findUserById(userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = userId;
      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      };

      next();
    } catch (err) {
      console.error("[Socket] Auth error:", err);
      next(new Error("Authentication failed: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id} (${socket.user.name})`);

    // ✅ Track active users
    if (!activeUsers.has(socket.userId)) {
      activeUsers.set(socket.userId, new Set());
    }
    activeUsers.get(socket.userId).add(socket.id);
    socketToUser.set(socket.id, socket.userId);

    socket.join(`user:${socket.userId}`);

    socket.emit("user:connected", {
      userId: socket.userId,
      socketId: socket.id,
    });

    // Send current online users list to the newly connected user
    const onlineUsersList = getActiveUsers();
    socket.emit('user:online:list', { userIds: onlineUsersList });
    console.log(`[Socket] Sent online users list to ${socket.userId}:`, onlineUsersList);

    // Notify others that user is online
    socket.broadcast.emit('user:online', { userId: socket.userId });
    console.log(`[Socket] Broadcasted user:online for ${socket.userId}`);

    // 📥 Join conversation
    socket.on("conversation:join", async (conversationId, ackCallback) => {
      if (!isValidObjectId(conversationId)) {
        console.log('[Socket] Invalid conversation ID:', conversationId);
        ackCallback?.({ success: false, error: 'Invalid conversation ID' });
        return;
      }

      socket.join(`conversation:${conversationId}`);
      console.log(`[Socket] ✓ User ${socket.userId} (${socket.user.name}) joined conversation: ${conversationId}`);

      // Get rooms for this socket to confirm join
      const rooms = await socket.rooms;
      const roomName = `conversation:${conversationId}`;
      const isInRoom = rooms.has(roomName);
      console.log(`[Socket] Socket rooms:`, [...rooms]);
      console.log(`[Socket] Is in conversation room:`, isInRoom);

      try {
        await dbConnect();

        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: socket.userId },
            status: { $in: ["sent", "delivered"] },
          },
          {
            status: "read",
            $push: {
              readBy: {
                user: socket.userId,
                readAt: new Date(),
              },
            },
          }
        );

        socket.to(`conversation:${conversationId}`).emit("messages:read", {
          conversationId,
          userId: socket.userId,
        });

        // Send acknowledgment back to client
        ackCallback?.({ success: true, roomId: conversationId, isInRoom });
      } catch (err) {
        console.error("[Read Error]:", err);
        ackCallback?.({ success: false, error: err.message });
      }
    });

    // 📤 Send message (with ACK)
    socket.on("message:send", async (data, ack) => {
      try {
        const { conversationId, content, type = "text" } = data;

        console.log('[Socket] === Message Send Request ===');
        console.log('[Socket] Conversation ID:', conversationId);
        console.log('[Socket] User ID:', socket.userId);
        console.log('[Socket] Content:', content);

        if (!isValidObjectId(conversationId) || !content) {
          console.log('[Socket] Invalid message data');
          return ack?.({ status: "error", message: "Invalid data" });
        }

        await dbConnect();

        // Check if user is participant (both stored as strings now)
        const convObjId = new mongoose.Types.ObjectId(conversationId);

        const conversation = await Conversation.findOne({
          _id: convObjId,
          participants: socket.userId, // Direct string comparison (no ObjectId conversion)
        });

        console.log('[Socket] Conversation found:', !!conversation);
        if (!conversation) {
          console.log('[Socket] User not participant in conversation:', conversationId);
          // Debug: Check what participants are in the conversation
          const debugConv = await Conversation.findById(conversationId);
          if (debugConv) {
            console.log('[Socket] Conversation participants:', debugConv.participants);
            console.log('[Socket] Socket userId:', socket.userId);
            console.log('[Socket] Looking for userId in participants:', debugConv.participants.some(p => p === socket.userId));
          }
          return ack?.({
            status: "error",
            message: "Not part of conversation",
          });
        }

        // Create message - store sender as STRING for consistency with session.user.id
        console.log('[Socket] Creating message...');
        const message = await Message.create({
          conversation: convObjId,
          sender: socket.userId, // Store as STRING to match session.user.id
          content,
          type,
          status: "sent",
          readBy: [{ user: socket.userId }], // Store as STRING
        });

        console.log('[Socket] ✓ Message created:', message._id);
        console.log('[Socket] Message sender:', message.sender, 'type:', typeof message.sender);

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        });

        // Fetch sender info from database for consistent format
        const sender = await findUserById(socket.userId);
        const formattedSender = sender ? {
          _id: sender._id.toString(),
          name: sender.name,
          email: sender.email,
        } : {
          _id: socket.userId,
          name: socket.user?.name || "User",
          email: socket.user?.email || "user@localhost",
        };

        // Emit to all users in the conversation
        console.log('[Socket] Emitting message to conversation:', conversationId);
        
        // Get all sockets in the conversation room
        const socketsInRoom = await io.in(`conversation:${conversationId}`).fetchSockets();
        console.log('[Socket] Sockets in conversation room:', socketsInRoom.length);
        console.log('[Socket] Socket IDs in room:', socketsInRoom.map(s => s.id));
        console.log('[Socket] User IDs in room:', socketsInRoom.map(s => s.userId));

        io.to(`conversation:${conversationId}`).emit("message:new", {
          _id: message._id.toString(),
          conversation: conversationId,
          sender: formattedSender,
          content: message.content,
          type: message.type,
          status: message.status,
          createdAt: message.createdAt.toISOString(),
        });

        console.log('[Socket] ✓ Message emitted successfully');
        ack?.({ status: "ok", message: { id: message._id.toString(), ...formattedSender } });

      } catch (err) {
        console.error("[Socket] Message send error:", err);
        console.error("[Socket] Error stack:", err.stack);
        ack?.({ status: "error", message: err.message });
      }
    });

    // ⌨ Typing indicators
    socket.on("typing:start", (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit("typing:started", {
        conversationId,
        userId: socket.userId,
        userName: socket.user.name,
      });
    });

    socket.on("typing:stop", (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit("typing:stopped", {
        conversationId,
        userId: socket.userId,
      });
    });

    // 🚚 Delivery updates
    socket.on("message:deliver", async ({ conversationId, messageIds }) => {
      try {
        if (!Array.isArray(messageIds)) return;

        await dbConnect();

        await Message.updateMany(
          { _id: { $in: messageIds }, status: "sent" },
          { status: "delivered" }
        );

        io.to(`conversation:${conversationId}`).emit(
          "messages:delivered",
          { conversationId, messageIds }
        );
      } catch (err) {
        console.error("[Delivery Error]:", err);
      }
    });

    // ❌ Disconnect cleanup
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      console.log(`[Socket] Disconnect reason:`, arguments[0]);
      console.log(`[Socket] User ${socket.userId} disconnected`);
      
      const userSockets = activeUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        socketToUser.delete(socket.id);
        
        if (userSockets.size === 0) {
          activeUsers.delete(socket.userId);
          console.log(`[Socket] User ${socket.userId} is now offline`);
          // Notify contacts
          io.emit('user:offline', { userId: socket.userId });
        } else {
          console.log(`[Socket] User ${socket.userId} still has ${userSockets.size} other connections`);
        }
      }
    });
  });

  return io;
}

// Helpers
export function getActiveUsers() {
  return [...activeUsers.keys()];
}

export function isUserOnline(userId) {
  return activeUsers.has(userId);
}