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

    // Check if already liked
    const existingLike = await db.like.findFirst({
      where: { userId, postId },
    });

    if (existingLike) {
      return NextResponse.json({ error: "لقد قمت بالإعجاب بالمنشور بالفعل" }, { status: 400 });
    }

    // Create like
    await db.like.create({
      data: { userId, postId },
    });

    // Increment post likes count
    await db.post.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    });

    // Create notification (don't notify self)
    if (post.userId !== userId) {
      await db.notification.create({
        data: {
          userId: post.userId,
          actorId: userId,
          type: "like",
          postId,
        },
      });
    }

    return NextResponse.json({ message: "تم الإعجاب بالمنشور" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/likes:", error);
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

    const existingLike = await db.like.findFirst({
      where: { userId, postId },
    });

    if (!existingLike) {
      return NextResponse.json({ error: "لم تقم بالإعجاب بهذا المنشور" }, { status: 404 });
    }

    await db.like.delete({
      where: { id: existingLike.id },
    });

    // Decrement post likes count
    await db.post.update({
      where: { id: postId },
      data: { likesCount: { decrement: 1 } },
    });

    return NextResponse.json({ message: "تم إزالة الإعجاب" });
  } catch (error) {
    console.error("Error in DELETE /api/likes:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}