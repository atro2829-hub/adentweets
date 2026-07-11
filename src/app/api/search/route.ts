import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: "كلمة البحث مطلوبة" }, { status: 400 });
    }

    const query = q.trim();

    // Search posts
    const posts = await db.post.findMany({
      where: {
        content: { contains: query },
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profileImageUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Search users
    const users = await db.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { fullName: { contains: query } },
        ],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        profileImageUrl: true,
        bio: true,
        isVerified: true,
        followersCount: true,
      },
      take: 20,
    });

    // Search hashtags
    const hashtags = await db.hashtag.findMany({
      where: {
        tag: { contains: query.toLowerCase() },
      },
      orderBy: { usageCount: "desc" },
      take: 20,
    });

    return NextResponse.json({ posts, users, hashtags });
  } catch (error) {
    console.error("Error in GET /api/search:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}