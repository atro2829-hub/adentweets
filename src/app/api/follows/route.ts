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

    const currentUserId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "followers";

    if (!userId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const where = type === "followers"
      ? { followingId: userId }
      : { followerId: userId };

    const targetField = type === "followers" ? "followerId" : "followingId";

    const follows = await db.follow.findMany({
      where,
      include: {
        follower: type === "followers" ? {
          select: { id: true, username: true, fullName: true, profileImageUrl: true, isVerified: true },
        } : false,
        following: type === "following" ? {
          select: { id: true, username: true, fullName: true, profileImageUrl: true, isVerified: true },
        } : false,
      },
      take: 50,
    });

    const users = follows.map((f) => {
      const u = type === "followers" ? f.follower : f.following;
      return {
        ...u,
        isFollowing: type === "following" ? true : !!u, // if viewing followers, we need to check
      };
    });

    // For followers list, check if current user follows each one
    if (type === "followers") {
      const followChecks = await Promise.all(
        users.map(async (u) => {
          const isFollowing = await db.follow.findFirst({
            where: { followerId: currentUserId, followingId: u.id },
          });
          return { ...u, isFollowing: !!isFollowing };
        })
      );
      return NextResponse.json({ users: followChecks });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in GET /api/follows:", error);
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
    const { followingId } = body;

    if (!followingId) {
      return NextResponse.json({ error: "معرف المستخدم المطلوب متابعة غير موجود" }, { status: 400 });
    }

    if (userId === followingId) {
      return NextResponse.json({ error: "لا يمكنك متابعة نفسك" }, { status: 400 });
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: followingId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // Check if already following
    const existingFollow = await db.follow.findFirst({
      where: { followerId: userId, followingId },
    });

    if (existingFollow) {
      return NextResponse.json({ error: "أنت تتابع هذا المستخدم بالفعل" }, { status: 400 });
    }

    // Check if blocked
    const blockRecord = await db.block.findFirst({
      where: {
        OR: [
          { userId: userId, blockedUserId: followingId },
          { userId: followingId, blockedUserId: userId },
        ],
      },
    });

    if (blockRecord) {
      return NextResponse.json({ error: "لا يمكنك متابعة هذا المستخدم" }, { status: 403 });
    }

    // Create follow
    await db.follow.create({
      data: { followerId: userId, followingId },
    });

    // Increment both counts
    await db.user.update({
      where: { id: userId },
      data: { followingCount: { increment: 1 } },
    });

    await db.user.update({
      where: { id: followingId },
      data: { followersCount: { increment: 1 } },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: followingId,
        actorId: userId,
        type: "follow",
      },
    });

    return NextResponse.json({ message: "تم المتابعة بنجاح" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/follows:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const followingId = searchParams.get("followingId");

    if (!followingId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const existingFollow = await db.follow.findFirst({
      where: { followerId: userId, followingId },
    });

    if (!existingFollow) {
      return NextResponse.json({ error: "أنت لا تتابع هذا المستخدم" }, { status: 404 });
    }

    await db.follow.delete({
      where: { id: existingFollow.id },
    });

    // Decrement both counts
    await db.user.update({
      where: { id: userId },
      data: { followingCount: { decrement: 1 } },
    });

    await db.user.update({
      where: { id: followingId },
      data: { followersCount: { decrement: 1 } },
    });

    return NextResponse.json({ message: "تم إلغاء المتابعة" });
  } catch (error) {
    console.error("Error in DELETE /api/follows:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}