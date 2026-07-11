import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await getServerSession(authOptions);

    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        location: true,
        website: true,
        profileImageUrl: true,
        bannerImageUrl: true,
        isVerified: true,
        isPrivate: true,
        followersCount: true,
        followingCount: true,
        postsCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    let isFollowing = false;
    let isBlocked = false;

    if (session?.user) {
      const currentUserId = (session.user as any).id;

      // Check if blocked
      const blockRecord = await db.block.findFirst({
        where: {
          OR: [
            { userId: currentUserId, blockedUserId: user.id },
            { userId: user.id, blockedUserId: currentUserId },
          ],
        },
      });
      isBlocked = !!blockRecord;

      // Check if following
      if (!isBlocked) {
        const followRecord = await db.follow.findFirst({
          where: {
            followerId: currentUserId,
            followingId: user.id,
          },
        });
        isFollowing = !!followRecord;
      }
    }

    return NextResponse.json({
      user: {
        ...user,
        isFollowing,
        isBlocked,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/users/[username]:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}