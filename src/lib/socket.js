// import { Server } from 'socket.io';
// import mongoose from 'mongoose';
// import dbConnect from './mongodb.js';
// import Message from './models/Message.js';
// import Conversation from './models/Conversation.js';
// import { findUserById } from './usersDb.js';

// // Store active users and their socket IDs
// const activeUsers = new Map(); // userId -> Set of socketIds
// const socketToUser = new Map(); // socketId -> userId

// export function initSocket(io) {
//   console.log('[Socket] Initializing Socket.io server...');
  
//   // Middleware for authentication
//   io.use(async (socket, next) => {
//     try {
//       const userId = socket.handshake.auth.userId;

//       console.log('[Socket] Authentication attempt with userId:', userId);

//       // Reject connections without userId
//       if (!userId) {
//         console.warn('[Socket] No userId provided, rejecting connection');
//         return next(new Error('Authentication required: userId must be provided'));
//       }

//       // Validate userId format (MongoDB ObjectId is 24 hex characters)
//       if (typeof userId !== 'string' || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
//         console.warn('[Socket] Invalid userId format:', userId);
//         return next(new Error('Invalid userId format'));
//       }

//       // Check if user exists
//       await dbConnect();
//       const user = await findUserById(userId);

//       if (!user) {
//         console.warn('[Socket] User not found:', userId);
//         return next(new Error('User not found'));
//       }

//       // Attach user to socket
//       socket.userId = userId;
//       socket.user = {
//         id: user._id.toString(),
//         name: user.name,
//         email: user.email,
//       };

//       console.log('[Socket] ✓ User authenticated:', socket.user.name, socket.userId);
//       next();
//     } catch (error) {
//       console.error('[Socket] Authentication error:', error);
//       next(new Error('Authentication failed: ' + (error.message || 'Unknown error')));
//     }
//   });

//   io.on('connection', (socket) => {
//     console.log('[Socket] ✓✓ Connection established:', socket.id, 'User:', socket.userId || 'anonymous');

//     // Reject unauthenticated connections
//     if (!socket.userId) {
//       console.warn('[Socket] Unauthenticated connection attempt, disconnecting');
//       socket.disconnect(true);
//       return;
//     }

//     // Store user-socket mapping
//     if (!activeUsers.has(socket.userId)) {
//       activeUsers.set(socket.userId, new Set());
//     }
//     activeUsers.get(socket.userId).add(socket.id);
//     socketToUser.set(socket.id, socket.userId);

//     // Join user's personal room
//     socket.join(`user:${socket.userId}`);

//     // Send user's conversations on connect
//     socket.emit('user:connected', { userId: socket.userId });

//     // Handle joining a conversation room
//     socket.on('conversation:join', async (conversationId) => {
//       socket.join(`conversation:${conversationId}`);
//       console.log(`User ${socket.userId} joined conversation ${conversationId}`);

//       // Mark messages as read
//       try {
//         await dbConnect();
//         await Message.updateMany(
//           {
//             conversation: conversationId,
//             sender: { $ne: socket.userId },
//             status: { $in: ['sent', 'delivered'] },
//           },
//           {
//             status: 'read',
//             $push: {
//               readBy: {
//                 user: socket.userId,
//                 readAt: new Date(),
//               },
//             },
//           }
//         );

//         // Notify others that messages were read
//         socket.to(`conversation:${conversationId}`).emit('messages:read', {
//           conversationId,
//           userId: socket.userId,
//         });
//       } catch (error) {
//         console.error('Error marking messages as read:', error);
//       }
//     });

//     // Handle leaving a conversation room
//     socket.on('conversation:leave', (conversationId) => {
//       socket.leave(`conversation:${conversationId}`);
//       console.log(`User ${socket.userId} left conversation ${conversationId}`);
//     });

//     // Handle sending a message
//     socket.on('message:send', async (data) => {
//       try {
//         const { conversationId, content, type = 'text' } = data;

//         if (!conversationId || !content) {
//           socket.emit('error', { message: 'Invalid message data' });
//           return;
//         }

//         // Validate conversationId format
//         if (!/^[0-9a-fA-F]{24}$/.test(conversationId)) {
//           socket.emit('error', { message: 'Invalid conversation ID format' });
//           return;
//         }

//         await dbConnect();

//         console.log('[Socket] Creating message:', { conversationId, sender: socket.userId, content });

//         // Verify user is a participant in the conversation
//         const conversation = await Conversation.findOne({
//           _id: new mongoose.Types.ObjectId(conversationId),
//           participants: new mongoose.Types.ObjectId(socket.userId),
//         });

//         if (!conversation) {
//           console.error('[Socket] User not participant in conversation:', conversationId);
//           socket.emit('error', { message: 'Conversation not found or you are not a participant' });
//           return;
//         }

//         // Create message using MongoDB collection directly to avoid middleware issues
//         const messageData = {
//           conversation: new mongoose.Types.ObjectId(conversationId),
//           sender: new mongoose.Types.ObjectId(socket.userId),
//           content,
//           type,
//           status: 'sent',
//           readBy: [{ user: new mongoose.Types.ObjectId(socket.userId), readAt: new Date() }],
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         };

//         const result = await Message.collection.insertOne(messageData);
//         console.log('[Socket] Message inserted:', result.insertedId);

//         // Get the created message with sender info
//         const message = await Message.findById(result.insertedId).populate('sender', '-password');
//         console.log('[Socket] Message created successfully:', message._id);

//         // Update conversation's last message
//         await Conversation.findByIdAndUpdate(conversationId, {
//           lastMessage: message._id,
//           updatedAt: new Date(),
//         });

//         // Emit to all users in the conversation
//         io.to(`conversation:${conversationId}`).emit('message:new', {
//           _id: message._id.toString(),
//           conversation: conversationId,
//           sender: message.sender,
//           content: message.content,
//           type: message.type,
//           status: message.status,
//           createdAt: message.createdAt,
//         });

//         // Emit to sender's other sockets
//         socket.emit('message:sent', { messageId: message._id.toString(), status: 'sent' });

//       } catch (error) {
//         console.error('[Socket] Error sending message:', error);
//         socket.emit('error', { message: 'Failed to send message: ' + error.message });
//       }
//     });

//     // Handle typing indicator
//     socket.on('typing:start', (conversationId) => {
//       socket.to(`conversation:${conversationId}`).emit('typing:started', {
//         conversationId,
//         userId: socket.userId,
//         userName: socket.user.name,
//       });
//     });

//     socket.on('typing:stop', (conversationId) => {
//       socket.to(`conversation:${conversationId}`).emit('typing:stopped', {
//         conversationId,
//         userId: socket.userId,
//       });
//     });

//     // Handle message delivery confirmation
//     socket.on('message:deliver', async (data) => {
//       try {
//         const { conversationId, messageIds } = data;

//         await dbConnect();
//         await Message.updateMany(
//           {
//             _id: { $in: messageIds },
//             status: 'sent',
//           },
//           { status: 'delivered' }
//         );

//         io.to(`conversation:${conversationId}`).emit('messages:delivered', {
//           conversationId,
//           messageIds,
//         });
//       } catch (error) {
//         console.error('Error delivering messages:', error);
//       }
//     });

//     // Handle disconnect
//     socket.on('disconnect', () => {
//       console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);

//       // Remove socket from active users
//       const userSockets = activeUsers.get(socket.userId);
//       if (userSockets) {
//         userSockets.delete(socket.id);
//         if (userSockets.size === 0) {
//           activeUsers.delete(socket.userId);
//           // Notify contacts that user is offline
//           io.emit('user:offline', { userId: socket.userId });
//         }
//       }
//       socketToUser.delete(socket.id);
//     });
//   });

//   return io;
// }

// // Helper function to get active users
// export function getActiveUsers() {
//   return Array.from(activeUsers.keys());
// }

// // Helper function to check if user is online
// export function isUserOnline(userId) {
//   return activeUsers.has(userId) && activeUsers.get(userId).size > 0;
// }



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

    // 📥 Join conversation
    socket.on("conversation:join", async (conversationId) => {
      if (!isValidObjectId(conversationId)) {
        console.log('[Socket] Invalid conversation ID:', conversationId);
        return;
      }
      
      socket.join(`conversation:${conversationId}`);
      console.log(`[Socket] ✓ User ${socket.userId} (${socket.user.name}) joined conversation: ${conversationId}`);
      
      // Get rooms for this socket
      const rooms = await socket.rooms;
      console.log(`[Socket] Socket rooms:`, [...rooms]);

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
      } catch (err) {
        console.error("[Read Error]:", err);
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

        // Check if user is participant - try both string and ObjectId comparison
        const convObjId = new mongoose.Types.ObjectId(conversationId);
        const userObjId = new mongoose.Types.ObjectId(socket.userId);
        
        const conversation = await Conversation.findOne({
          _id: convObjId,
          participants: userObjId,
        });

        console.log('[Socket] Conversation found:', !!conversation);
        if (!conversation) {
          console.log('[Socket] User not participant in conversation:', conversationId);
          // Debug: Check what participants are in the conversation
          const debugConv = await Conversation.findById(conversationId);
          if (debugConv) {
            console.log('[Socket] Conversation participants:', debugConv.participants.map(p => p.toString()));
            console.log('[Socket] Socket userId:', socket.userId);
            console.log('[Socket] Looking for userId in participants:', debugConv.participants.some(p => p.toString() === socket.userId));
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
        console.log('[Socket] Rooms in conversation:', await io.in(`conversation:${conversationId}`).fetchSockets().then(sockets => sockets.length));
        
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