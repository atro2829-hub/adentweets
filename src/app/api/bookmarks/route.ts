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
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const bookmarks = await db.bookmark.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        post: {
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
            hashtags: {
              include: {
                hashtag: {
                  select: { tag: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (bookmarks.length > limit) {
      const nextBookmark = bookmarks.pop();
      nextCursor = nextBookmark!.createdAt.toISOString();
    }

    const enrichedBookmarks = bookmarks.map((b) => ({
      ...b,
      post: {
        ...b.post,
        hashtags: b.post.hashtags.map((ph) => ph.hashtag.tag),
        isLiked: true,
        isRetweeted: false,
        isBookmarked: true,
      },
    }));

    return NextResponse.json({ bookmarks: enrichedBookmarks, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/bookmarks:", error);
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
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "معرف المنشور مطلوب" }, { status: 400 });
    }

    // Check post exists
    const post = await db.post.findUnique({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      return NextResponse.json({ error: "المنشور غير موجود" }, { status: 404 });
    }

    // Check if already bookmarked
    const existingBookmark = await db.bookmark.findFirst({
      where: { userId, postId },
    });

    if (existingBookmark) {
      return NextResponse.json({ error: "المنشور محفوظ بالفعل" }, { status: 400 });
    }

    await db.bookmark.create({
      data: { userId, postId },
    });

    return NextResponse.json({ message: "تم حفظ المنشور" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/bookmarks:", error);
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
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "معرف المنشور مطلوب" }, { status: 400 });
    }

    const existingBookmark = await db.bookmark.findFirst({
      where: { userId, postId },
    });

    if (!existingBookmark) {
      return NextResponse.json({ error: "المنشور غير محفوظ" }, { status: 404 });
    }

    await db.bookmark.delete({
      where: { id: existingBookmark.id },
    });

    return NextResponse.json({ message: "تم إزالة الحفظ" });
  } catch (error) {
    console.error("Error in DELETE /api/bookmarks:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}