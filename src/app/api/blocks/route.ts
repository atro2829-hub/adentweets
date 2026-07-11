import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    if (userId === blockedUserId) {
      return NextResponse.json({ error: "لا يمكنك حظر نفسك" }, { status: 400 });
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: blockedUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // Check if already blocked
    const existingBlock = await db.block.findFirst({
      where: { userId, blockedUserId },
    });

    if (existingBlock) {
      return NextResponse.json({ error: "لقد قمت بحظر هذا المستخدم بالفعل" }, { status: 400 });
    }

    // Create block
    await db.block.create({
      data: { userId, blockedUserId },
    });

    // Remove follow relationship if exists
    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: blockedUserId },
          { followerId: blockedUserId, followingId: userId },
        ],
      },
    });

    // Update follow counts
    const followStats = await db.follow.findMany({
      where: {
        OR: [
          { followerId: userId },
          { followingId: userId },
          { followerId: blockedUserId },
          { followingId: blockedUserId },
        ],
      },
    });

    const userFollowingCount = followStats.filter((f) => f.followerId === userId).length;
    const userFollowersCount = followStats.filter((f) => f.followingId === userId).length;
    const blockedFollowingCount = followStats.filter((f) => f.followerId === blockedUserId).length;
    const blockedFollowersCount = followStats.filter((f) => f.followingId === blockedUserId).length;

    await db.user.update({
      where: { id: userId },
      data: { followingCount: userFollowingCount, followersCount: userFollowersCount },
    });

    await db.user.update({
      where: { id: blockedUserId },
      data: { followingCount: blockedFollowingCount, followersCount: blockedFollowersCount },
    });

    return NextResponse.json({ message: "تم حظر المستخدم" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/blocks:", error);
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
    const blockedUserId = searchParams.get("blockedUserId");

    if (!blockedUserId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const existingBlock = await db.block.findFirst({
      where: { userId, blockedUserId },
    });

    if (!existingBlock) {
      return NextResponse.json({ error: "لم تقم بحظر هذا المستخدم" }, { status: 404 });
    }

    await db.block.delete({
      where: { id: existingBlock.id },
    });

    return NextResponse.json({ message: "تم إلغاء الحظر" });
  } catch (error) {
    console.error("Error in DELETE /api/blocks:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}