// Set up database URL to point to the main project's database
process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db';

import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const PORT = 3004;

// Track online users: map of userId -> Set of socket ids
const onlineUsers = new Map<string, Set<string>>();
// Track socket-to-user mapping: map of socketId -> userId
const socketToUser = new Map<string, string>();

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

console.log(`[Chat Service] Socket.io server starting on port ${PORT}...`);

io.on('connection', (socket) => {
  console.log(`[Chat Service] Socket connected: ${socket.id}`);

  /**
   * 1. JOIN EVENT
   * When a user connects, they send their userId via 'join' to register themselves.
   */
  socket.on('join', async (userId: string) => {
    if (!userId || typeof userId !== 'string') {
      socket.emit('error', { message: 'Invalid userId provided' });
      return;
    }

    // Store socket-to-user mapping
    socketToUser.set(socket.id, userId);

    // Add to online users tracking
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join a room named by userId so we can target specific users
    await socket.join(userId);

    console.log(`[Chat Service] User ${userId} joined (socket: ${socket.id})`);

    // Broadcast online status to all connected clients
    io.emit('user_online', { userId });

    // Send back the current list of online users to the joining user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('online_users', { users: onlineUserIds });
  });

  /**
   * 2. PRIVATE MESSAGE EVENT
   * Listen for 'private_message' with { recipientId, content, imageUrl }
   * - Save to database
   * - Find or create a Conversation
   * - Emit the message to the recipient's socket room
   */
  socket.on('private_message', async (data: { recipientId: string; content: string; imageUrl?: string }) => {
    const senderId = socketToUser.get(socket.id);
    if (!senderId) {
      socket.emit('error', { message: 'Not authenticated. Send a join event first.' });
      return;
    }

    const { recipientId, content, imageUrl } = data;
    if (!recipientId || !content) {
      socket.emit('error', { message: 'recipientId and content are required' });
      return;
    }

    try {
      // Find or create the conversation between sender and recipient
      const existingConversation = await db.conversation.findFirst({
        where: {
          OR: [
            { user1Id: senderId, user2Id: recipientId },
            { user1Id: recipientId, user2Id: senderId },
          ],
        },
      });

      let conversationId: string;

      if (existingConversation) {
        conversationId = existingConversation.id;
        // Update lastMessageAt
        await db.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });
      } else {
        // Create new conversation (normalize so the smaller id is user1)
        const [u1, u2] = senderId < recipientId ? [senderId, recipientId] : [recipientId, senderId];
        const newConversation = await db.conversation.create({
          data: {
            user1Id: u1,
            user2Id: u2,
          },
        });
        conversationId = newConversation.id;
      }

      // Save the message to the database
      const message = await db.message.create({
        data: {
          senderId,
          recipientId,
          content,
          imageUrl: imageUrl || '',
          conversationId,
        },
      });

      // Emit the message to the recipient's room
      const messagePayload = {
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        content: message.content,
        imageUrl: message.imageUrl,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
        conversationId: message.conversationId,
      };

      // Send to recipient
      io.to(recipientId).emit('new_message', messagePayload);

      // Also send back to sender for confirmation
      socket.emit('message_sent', messagePayload);

      console.log(`[Chat Service] Message from ${senderId} to ${recipientId}: ${content.substring(0, 50)}...`);
    } catch (error) {
      console.error('[Chat Service] Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  /**
   * 3. TYPING INDICATOR
   * Listen for 'typing' with { recipientId }
   * Emit 'user_typing' to the recipient
   */
  socket.on('typing', (data: { recipientId: string }) => {
    const senderId = socketToUser.get(socket.id);
    if (!senderId || !data.recipientId) return;

    io.to(data.recipientId).emit('user_typing', { userId: senderId });
  });

  /**
   * 3b. STOP TYPING INDICATOR
   * Listen for 'stop_typing' with { recipientId }
   */
  socket.on('stop_typing', (data: { recipientId: string }) => {
    const senderId = socketToUser.get(socket.id);
    if (!senderId || !data.recipientId) return;

    io.to(data.recipientId).emit('user_stop_typing', { userId: senderId });
  });

  /**
   * 4. ONLINE STATUS
   * Handled via connect/disconnect + join event (see above and below)
   */

  /**
   * 5. MESSAGE READ
   * Listen for 'message_read' with { conversationId }
   * Mark messages as read and emit confirmation
   */
  socket.on('message_read', async (data: { conversationId: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId || !data.conversationId) return;

    try {
      // Mark all unread messages in this conversation where the user is the recipient as read
      const result = await db.message.updateMany({
        where: {
          conversationId: data.conversationId,
          recipientId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      if (result.count > 0) {
        console.log(`[Chat Service] Marked ${result.count} messages as read in conversation ${data.conversationId} for user ${userId}`);
      }

      // Emit confirmation back to the reader
      socket.emit('messages_read', {
        conversationId: data.conversationId,
        count: result.count,
      });

      // Notify the other participant in the conversation that messages were read
      const conversation = await db.conversation.findUnique({
        where: { id: data.conversationId },
      });

      if (conversation) {
        const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
        io.to(otherUserId).emit('messages_read', {
          conversationId: data.conversationId,
          byUserId: userId,
          count: result.count,
        });
      }
    } catch (error) {
      console.error('[Chat Service] Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  /**
   * DISCONNECT
   * Clean up online status tracking
   */
  socket.on('disconnect', () => {
    const userId = socketToUser.get(socket.id);

    if (userId) {
      // Remove this socket from the user's online set
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        // If no more sockets for this user, they are fully offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_offline', { userId });
          console.log(`[Chat Service] User ${userId} went offline`);
        }
      }
    }

    // Clean up mapping
    socketToUser.delete(socket.id);
    console.log(`[Chat Service] Socket disconnected: ${socket.id}`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Chat Service] Shutting down...');
  io.close();
  await db.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Chat Service] Shutting down...');
  io.close();
  await db.$disconnect();
  process.exit(0);
});

console.log(`[Chat Service] ✅ Socket.io server running on port ${PORT}`);