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

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (q) {
      // Search users by query
      const users = await db.user.findMany({
        where: {
          OR: [
            { username: { contains: q } },
            { fullName: { contains: q } },
          ],
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          profileImageUrl: true,
          bio: true,
          isVerified: true,
        },
        take: 20,
      });

      return NextResponse.json({ users });
    }

    // Get current user profile
    const userId = (session.user as any).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
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

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    const { fullName, bio, location, website, profileImageUrl, bannerImageUrl, isPrivate } = body;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(profileImageUrl !== undefined && { profileImageUrl }),
        ...(bannerImageUrl !== undefined && { bannerImageUrl }),
        ...(isPrivate !== undefined && { isPrivate }),
      },
      select: {
        id: true,
        email: true,
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

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error in PUT /api/users:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}