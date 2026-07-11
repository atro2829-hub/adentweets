'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, Heart, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { PostData, UserData, CommentData } from '@/lib/types';
import {
  ref,
  onValue,
  off,
  push,
  set as firebaseSet,
  get,
  update,
  query,
  orderByChild,
  equalTo,
  remove,
} from 'firebase/database';
import { db } from '@/lib/firebase';

export function PostDetailView() {
  const { selectedPostId, goBack } = useAppStore();
  const { user, userData } = useAuth();
  const userId = user?.uid;

  const [post, setPost] = useState<PostData | null>(null);
  const [postAuthor, setPostAuthor] = useState<UserData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, UserData>>({});
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch post
  useEffect(() => {
    if (!selectedPostId) return;
    const postRef = ref(db, `posts/${selectedPostId}`);

    const unsub = onValue(postRef, async (snap) => {
      if (snap.exists()) {
        const postData = snap.val() as PostData;
        setPost(postData);

        // Fetch author
        const aSnap = await get(ref(db, `users/${postData.userId}`));
        if (aSnap.exists()) {
          setPostAuthor(aSnap.val());
        }
      } else {
        setPost(null);
      }
      setIsLoading(false);
    });

    return () => off(postRef);
  }, [selectedPostId]);

  // Fetch comments
  useEffect(() => {
    if (!selectedPostId) return;
    const commentsQuery = query(
      ref(db, 'comments'),
      orderByChild('postId'),
      equalTo(selectedPostId)
    );

    const unsub = onValue(commentsQuery, async (snap) => {
      if (!snap.exists()) {
        setComments([]);
        return;
      }

      const data = snap.val() as Record<string, CommentData>;
      const allComments: CommentData[] = Object.values(data)
        .filter((c) => !c.isDeleted)
        .sort((a, b) => a.timestamp - b.timestamp);

      setComments(allComments);

      // Fetch comment authors
      const authorIds = [...new Set(allComments.map((c) => c.userId))];
      const newAuthors: Record<string, UserData> = {};
      for (const aid of authorIds) {
        try {
          const aSnap = await get(ref(db, `users/${aid}`));
          if (aSnap.exists()) {
            newAuthors[aid] = aSnap.val();
          }
        } catch {
          // skip
        }
      }
      setCommentAuthors((prev) => ({ ...prev, ...newAuthors }));
    });

    return () => off(commentsQuery);
  }, [selectedPostId]);

  // Check liked comments
  useEffect(() => {
    if (!userId || comments.length === 0) return;
    const unsubFns: (() => void)[] = [];

    for (const comment of comments) {
      const likeRef = ref(db, `commentLikes/${comment.id}/${userId}`);
      const unsub = onValue(likeRef, (snap) => {
        if (snap.exists()) {
          setLikedComments((prev) => new Set([...prev, comment.id]));
        } else {
          setLikedComments((prev) => {
            const next = new Set(prev);
            next.delete(comment.id);
            return next;
          });
        }
      });
      unsubFns.push(unsub);
    }

    return () => unsubFns.forEach((fn) => fn());
  }, [userId, comments]);

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedPostId || !userId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const commentRef = push(ref(db, 'comments'));
      const commentData: Partial<CommentData> = {
        id: commentRef.key,
        postId: selectedPostId,
        userId,
        content: replyContent.trim(),
        imageBase64: replyImage,
        timestamp: Date.now(),
        likesCount: 0,
        parentId: null,
        isDeleted: false,
      };

      await firebaseSet(ref(db, `comments/${commentRef.key}`), commentData);

      // Increment comment count
      const countSnap = await get(ref(db, `posts/${selectedPostId}/commentsCount`));
      await update(ref(db, `posts/${selectedPostId}`), {
        commentsCount: (countSnap.val() || 0) + 1,
      });

      setReplyContent('');
      setReplyImage('');
      toast.success('تم نشر الرد');
    } catch {
      toast.error('فشل في نشر الرد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!userId) return;
    const wasLiked = likedComments.has(commentId);

    try {
      const likeRef = ref(db, `commentLikes/${commentId}/${userId}`);
      if (wasLiked) {
        await remove(likeRef);
        const snap = await get(ref(db, `comments/${commentId}/likesCount`));
        await update(ref(db, `comments/${commentId}`), {
          likesCount: Math.max(0, (snap.val() || 0) - 1),
        });
      } else {
        await firebaseSet(likeRef, true);
        const snap = await get(ref(db, `comments/${commentId}/likesCount`));
        await update(ref(db, `comments/${commentId}`), {
          likesCount: (snap.val() || 0) + 1,
        });
      }
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReplyImage(result.split(',')[1] || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-4 w-full mt-3" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </div>
    );
  }

  if (!post || post.isDeleted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-muted-foreground">لم يتم العثور على المنشور</p>
      </div>
    );
  }

  const avatar = userData?.avatarBase64 || '';
  const name = userData?.fullName || 'مستخدم';

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">التغريدة</h1>
      </div>

      {/* Main Post */}
      <PostCard post={post} author={postAuthor} />

      {/* Reply Input */}
      <div className="flex gap-3 px-4 py-3 border-b border-border/50">
        <div className="shrink-0">
          {avatar ? (
            <img
              src={`data:image/jpeg;base64,${avatar}`}
              alt={name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="اكتب ردك..."
            className="min-h-[60px] resize-none border-0 bg-transparent text-sm focus-visible:ring-0 p-0 placeholder:text-muted-foreground/60"
            dir="rtl"
          />

          {replyImage && (
            <div className="relative rounded-xl overflow-hidden border border-border/50 mt-2">
              <img
                src={`data:image/jpeg;base64,${replyImage}`}
                alt="صورة الرد"
                className="w-full max-h-32 object-cover"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 hover:bg-black/80"
                onClick={() => setReplyImage('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="rounded-full px-4 font-bold"
              disabled={!replyContent.trim() || isSubmitting}
              onClick={handleReply}
            >
              {isSubmitting ? (
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'رد'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="px-4 py-2">
        <p className="text-sm font-bold text-muted-foreground">
          {comments.length > 0 ? `${comments.length} رد` : 'لا توجد ردود بعد'}
        </p>
      </div>

      {comments.map((comment) => {
        const author = commentAuthors[comment.userId];
        const isCommentLiked = likedComments.has(comment.id);

        return (
          <div
            key={comment.id}
            className="border-b border-border/50 px-4 py-3"
          >
            <div className="flex gap-3">
              <button
                className="shrink-0"
                onClick={() => {
                  const store = useAppStore.getState();
                  store.setViewParams({ userId: comment.userId });
                  store.navigate('profile');
                }}
              >
                {author?.avatarBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${author.avatarBase64}`}
                    alt={author.fullName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                    {author?.fullName?.charAt(0) || 'م'}
                  </div>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm">{author?.fullName || 'مستخدم'}</span>
                  {author?.isVerified && (
                    <span className="text-rose-400 text-xs">✓</span>
                  )}
                  <span className="text-muted-foreground text-xs">@{author?.username || 'user'}</span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
                {comment.imageBase64 && (
                  <img
                    src={`data:image/jpeg;base64,${comment.imageBase64}`}
                    alt="صورة الرد"
                    className="mt-2 rounded-xl max-h-48 object-cover"
                  />
                )}
                <div className="flex items-center gap-4 mt-2">
                  <button
                    className={`flex items-center gap-1 text-xs ${isCommentLiked ? 'text-rose-500' : 'text-muted-foreground'}`}
                    onClick={() => handleLikeComment(comment.id)}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isCommentLiked ? 'fill-rose-500' : ''}`} />
                    {(comment.likesCount || 0) > 0 && comment.likesCount}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}