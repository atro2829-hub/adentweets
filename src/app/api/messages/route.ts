import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get conversations where user is user1 or user2
    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profileImageUrl: true,
            isVerified: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profileImageUrl: true,
            isVerified: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            isRead: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Get unread count for each conversation
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;

        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          otherUser,
          lastMessage,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
        };
      })
    );

    return NextResponse.json({ conversations: enrichedConversations });
  } catch (error) {
    console.error("Error in GET /api/messages:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { recipientId, content, imageUrl } = body;

    if (!recipientId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: "معرف المستلم والمحتوى مطلوبان" }, { status: 400 });
    }

    if (userId === recipientId) {
      return NextResponse.json({ error: "لا يمكنك إرسال رسالة لنفسك" }, { status: 400 });
    }

    // Check recipient exists
    const recipient = await db.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // Find or create conversation
    let conversation = await db.conversation.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: recipientId },
          { user1Id: recipientId, user2Id: userId },
        ],
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          user1Id: userId,
          user2Id: recipientId,
        },
      });
    }

    // Create message
    const message = await db.message.create({
      data: {
        senderId: userId,
        recipientId,
        content: content.trim(),
        imageUrl: imageUrl || "",
        conversationId: conversation.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ message, conversationId: conversation.id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/messages:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}