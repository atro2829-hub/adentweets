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

    // Check if already retweeted
    const existingRetweet = await db.retweet.findFirst({
      where: { userId, postId },
    });

    if (existingRetweet) {
      return NextResponse.json({ error: "لقد قمت بإعادة النشر بالفعل" }, { status: 400 });
    }

    // Create retweet
    await db.retweet.create({
      data: { userId, postId },
    });

    // Increment post retweets count
    await db.post.update({
      where: { id: postId },
      data: { retweetsCount: { increment: 1 } },
    });

    // Create notification (don't notify self)
    if (post.userId !== userId) {
      await db.notification.create({
        data: {
          userId: post.userId,
          actorId: userId,
          type: "retweet",
          postId,
        },
      });
    }

    return NextResponse.json({ message: "تم إعادة النشر" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/retweets:", error);
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

    const existingRetweet = await db.retweet.findFirst({
      where: { userId, postId },
    });

    if (!existingRetweet) {
      return NextResponse.json({ error: "لم تقم بإعادة نشر هذا المنشور" }, { status: 404 });
    }

    await db.retweet.delete({
      where: { id: existingRetweet.id },
    });

    // Decrement post retweets count
    await db.post.update({
      where: { id: postId },
      data: { retweetsCount: { decrement: 1 } },
    });

    return NextResponse.json({ message: "تم إلغاء إعادة النشر" });
  } catch (error) {
    console.error("Error in DELETE /api/retweets:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}