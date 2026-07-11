import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "معرف المنشور مطلوب" }, { status: 400 });
    }

    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const comments = await db.comment.findMany({
      where: {
        postId,
        parentId: null, // Only top-level comments
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
          select: { replies: true, likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (comments.length > limit) {
      const nextComment = comments.pop();
      nextCursor = nextComment!.createdAt.toISOString();
    }

    // Check if current user liked each comment
    let enrichedComments = comments;
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const userId = (session.user as any).id;
      enrichedComments = await Promise.all(
        comments.map(async (comment) => {
          const like = await db.like.findFirst({
            where: { userId, commentId: comment.id },
          });
          return {
            ...comment,
            _count: undefined,
            repliesCount: comment._count.replies,
            likesCount: comment._count.likes,
            isLiked: !!like,
          };
        })
      );
    } else {
      enrichedComments = comments.map((comment) => ({
        ...comment,
        _count: undefined,
        repliesCount: comment._count.replies,
        likesCount: comment._count.likes,
        isLiked: false,
      }));
    }

    return NextResponse.json({ comments: enrichedComments, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/comments:", error);
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
    const { postId, content, parentId } = body;

    if (!postId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: "معرف المنشور والمحتوى مطلوبان" }, { status: 400 });
    }

    // Check post exists
    const post = await db.post.findUnique({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      return NextResponse.json({ error: "المنشور غير موجود" }, { status: 404 });
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        postId,
        userId,
        content: content.trim(),
        ...(parentId ? { parentId } : {}),
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

    // Increment post comments count
    await db.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    // Create notification (don't notify self)
    if (post.userId !== userId) {
      await db.notification.create({
        data: {
          userId: post.userId,
          actorId: userId,
          type: "comment",
          postId,
          commentId: comment.id,
        },
      });
    }

    return NextResponse.json(
      {
        comment: {
          ...comment,
          isLiked: false,
          repliesCount: 0,
          likesCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/comments:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}