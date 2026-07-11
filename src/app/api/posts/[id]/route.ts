import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const post = await db.post.findUnique({
      where: { id, isDeleted: false },
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
        _count: {
          select: {
            likes: true,
            comments: true,
            retweets: true,
          },
        },
      },
    });

    if (!post || post.isDeleted) {
      return NextResponse.json({ error: "المنشور غير موجود" }, { status: 404 });
    }

    let isLiked = false;
    let isRetweeted = false;
    let isBookmarked = false;

    if (session?.user) {
      const userId = (session.user as any).id;
      const [like, retweet, bookmark] = await Promise.all([
        db.like.findFirst({ where: { userId, postId: id } }),
        db.retweet.findFirst({ where: { userId, postId: id } }),
        db.bookmark.findFirst({ where: { userId, postId: id } }),
      ]);
      isLiked = !!like;
      isRetweeted = !!retweet;
      isBookmarked = !!bookmark;
    }

    // Increment views count
    await db.post.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    // Get parent post (quote retweet)
    let parentPost = null;
    if (post.parentPostId) {
      parentPost = await db.post.findUnique({
        where: { id: post.parentPostId, isDeleted: false },
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
      });
    }

    return NextResponse.json({
      post: {
        ...post,
        hashtags: post.hashtags.map((ph) => ph.hashtag.tag),
        isLiked,
        isRetweeted,
        isBookmarked,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        retweetsCount: post._count.retweets,
        _count: undefined,
        parentPost,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/posts/[id]:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "محتوى المنشور مطلوب" }, { status: 400 });
    }

    const existingPost = await db.post.findUnique({
      where: { id },
    });

    if (!existingPost || existingPost.isDeleted) {
      return NextResponse.json({ error: "المنشور غير موجود" }, { status: 404 });
    }

    if (existingPost.userId !== userId) {
      return NextResponse.json({ error: "ليس لديك صلاحية تعديل هذا المنشور" }, { status: 403 });
    }

    // Check if within 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (existingPost.createdAt < thirtyMinutesAgo) {
      return NextResponse.json(
        { error: "انتهت مهلة تعديل المنشور (٣٠ دقيقة)" },
        { status: 400 }
      );
    }

    // Extract hashtags from new content
    const hashtagRegex = /#\w+/g;
    const hashtagMatches = content.match(hashtagRegex) || [];
    const uniqueHashtags = [...new Set(hashtagMatches.map((tag) => tag.toLowerCase()))];

    // Delete old post-hashtag associations
    await db.postHashtag.deleteMany({
      where: { postId: id },
    });

    // Decrement old hashtag usage counts and remove unused
    const oldHashtags = await db.postHashtag.findMany({
      where: { postId: id },
    });

    // Update post content
    const updatedPost = await db.post.update({
      where: { id },
      data: { content: content.trim() },
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
    });

    // Process new hashtags
    for (const tag of uniqueHashtags) {
      const hashtag = await db.hashtag.upsert({
        where: { tag },
        create: { tag, usageCount: 1 },
        update: { usageCount: { increment: 1 } },
      });

      await db.postHashtag.create({
        data: {
          postId: id,
          hashtagId: hashtag.id,
        },
      });
    }

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error("Error in PUT /api/posts/[id]:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;

    const existingPost = await db.post.findUnique({
      where: { id },
    });

    if (!existingPost || existingPost.isDeleted) {
      return NextResponse.json({ error: "المنشور غير موجود" }, { status: 404 });
    }

    if (existingPost.userId !== userId) {
      return NextResponse.json({ error: "ليس لديك صلاحية حذف هذا المنشور" }, { status: 403 });
    }

    // Soft delete
    await db.post.update({
      where: { id },
      data: { isDeleted: true },
    });

    // Decrement user posts count
    await db.user.update({
      where: { id: userId },
      data: { postsCount: { decrement: 1 } },
    });

    return NextResponse.json({ message: "تم حذف المنشور بنجاح" });
  } catch (error) {
    console.error("Error in DELETE /api/posts/[id]:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}