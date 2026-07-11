import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const usernameFilter = searchParams.get("username");

    if (!session?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // If filtering by username, find the user first
    let targetUserId: string | undefined;
    if (usernameFilter) {
      const targetUser = await db.user.findUnique({
        where: { username: usernameFilter },
        select: { id: true },
      });
      if (!targetUser) {
        return NextResponse.json({ posts: [], nextCursor: null });
      }
      targetUserId = targetUser.id;
    }

    // Get followed user IDs (only for feed, not for profile)
    let allowedUserIds: string[] | undefined;
    if (!targetUserId) {
      const follows = await db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      allowedUserIds = follows.map((f) => f.followingId);
      allowedUserIds.push(userId);
    }

    const posts = await db.post.findMany({
      where: {
        userId: targetUserId || { in: allowedUserIds },
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
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
        _count: {
          select: {
            likes: true,
            comments: true,
            retweets: true,
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
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const nextPost = posts.pop();
      nextCursor = nextPost!.createdAt.toISOString();
    }

    // Check if current user liked/retweeted/bookmarked each post
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const [like, retweet, bookmark] = await Promise.all([
          db.like.findFirst({
            where: { userId, postId: post.id },
          }),
          db.retweet.findFirst({
            where: { userId, postId: post.id },
          }),
          db.bookmark.findFirst({
            where: { userId, postId: post.id },
          }),
        ]);

        return {
          ...post,
          hashtags: post.hashtags.map((ph) => ph.hashtag.tag),
          isLiked: !!like,
          isRetweeted: !!retweet,
          isBookmarked: !!bookmark,
          _count: undefined,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
          retweetsCount: post._count.retweets,
        };
      })
    );

    return NextResponse.json({ posts: enrichedPosts, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/posts:", error);
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
    const { content, imageUrls, parentPostId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "محتوى المنشور مطلوب" }, { status: 400 });
    }

    // Extract hashtags from content
    const hashtagRegex = /#\w+/g;
    const hashtagMatches = content.match(hashtagRegex) || [];
    const uniqueHashtags = [...new Set(hashtagMatches.map((tag) => tag.toLowerCase()))];

    // Create the post
    const post = await db.post.create({
      data: {
        userId,
        content: content.trim(),
        imageUrls: imageUrls || "",
        ...(parentPostId ? { parentPostId } : {}),
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
    });

    // Process hashtags
    for (const tag of uniqueHashtags) {
      const hashtag = await db.hashtag.upsert({
        where: { tag },
        create: { tag, usageCount: 1 },
        update: { usageCount: { increment: 1 } },
      });

      await db.postHashtag.create({
        data: {
          postId: post.id,
          hashtagId: hashtag.id,
        },
      });
    }

    // Increment user posts count
    await db.user.update({
      where: { id: userId },
      data: { postsCount: { increment: 1 } },
    });

    // Get hashtags for response
    const postHashtags = await db.postHashtag.findMany({
      where: { postId: post.id },
      include: { hashtag: { select: { tag: true } } },
    });

    return NextResponse.json(
      {
        post: {
          ...post,
          hashtags: postHashtags.map((ph) => ph.hashtag.tag),
          isLiked: false,
          isRetweeted: false,
          isBookmarked: false,
          likesCount: 0,
          commentsCount: 0,
          retweetsCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/posts:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}