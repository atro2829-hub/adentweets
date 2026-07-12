'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { PostCard } from '@/components/tweets/post-card';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowRight,
  Send,
  ImageIcon,
  Heart,
  Repeat2,
  Bookmark,
  Eye,
  MessageSquare,
  MoreVertical,
  Trash2,
  X,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ref,
  get,
  push,
  set as firebaseSet,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import type { PostData, UserData, CommentData } from '@/lib/types';

function CommentItem({
  comment,
  author,
  currentUserId,
  onReply,
  depth = 0,
}: {
  comment: CommentData;
  author: UserData | null;
  currentUserId: string | null;
  onReply: (comment: CommentData) => void;
  depth?: number;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likesCount || 0);
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [replyAuthors, setReplyAuthors] = useState<Record<string, UserData>>({});
  const [showReplies, setShowReplies] = useState(false);

  // Check like
  useEffect(() => {
    if (!currentUserId || !comment.id) return;
    const likeRef = ref(db, `commentLikes/${comment.id}/${currentUserId}`);
    const unsub = onValue(likeRef, (snap) => setIsLiked(!!snap.val()));
    return () => off(likeRef);
  }, [currentUserId, comment.id]);

  // Fetch nested replies
  useEffect(() => {
    const repliesRef = query(ref(db, 'comments'), orderByChild('parentId'), equalTo(comment.id));
    const unsub = onValue(repliesRef, (snap) => {
      if (!snap.exists()) { setReplies([]); return; }
      const data = snap.val() as Record<string, CommentData>;
      const sorted = Object.values(data)
        .filter((r) => !r.isDeleted)
        .sort((a, b) => b.timestamp - a.timestamp);
      setReplies(sorted);
      // Fetch authors
      sorted.forEach(async (r) => {
        if (replyAuthors[r.userId]) return;
        try {
          const s = await get(ref(db, `users/${r.userId}`));
          if (s.exists()) setReplyAuthors((prev) => ({ ...prev, [r.userId]: s.val() as UserData }));
        } catch { /* ignore */ }
      });
    });
    return () => off(repliesRef);
  }, [comment.id, replyAuthors]);

  const handleLike = async () => {
    if (!currentUserId || !comment.id) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      const likeRef = ref(db, `commentLikes/${comment.id}/${currentUserId}`);
      if (wasLiked) {
        await remove(likeRef);
        const snap = await get(ref(db, `comments/${comment.id}/likesCount`));
        await update(ref(db, `comments/${comment.id}`), { likesCount: Math.max(0, (snap.val() || 0) - 1) });
      } else {
        await firebaseSet(likeRef, true);
        const snap = await get(ref(db, `comments/${comment.id}/likesCount`));
        await update(ref(db, `comments/${comment.id}`), { likesCount: (snap.val() || 0) + 1 });
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    }
  };

  const handleDelete = async () => {
    if (!comment.id) return;
    try {
      await update(ref(db, `comments/${comment.id}`), { isDeleted: true });
      toast.success('تم حذف التعليق');
    } catch {
      toast.error('فشل في حذف التعليق');
    }
  };

  const authorName = author?.fullName || 'مستخدم';
  const authorUsername = author?.username || 'user';

  return (
    <div style={{ marginRight: depth * 24 }}>
      <div className="flex gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="shrink-0">
          {author?.avatarBase64 ? (
            <img
              src={`data:image/jpeg;base64,${author.avatarBase64}`}
              alt={authorName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {authorName.charAt(0)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-sm truncate">{authorName}</span>
              <VerificationBadge type={author?.verificationType || 'none'} size="sm" />
              <span className="text-muted-foreground text-xs truncate">@{authorUsername}</span>
              <span className="text-muted-foreground text-xs">· {formatRelativeTime(comment.timestamp)}</span>
            </div>

            {currentUserId === comment.userId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem className="text-rose-500" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 ml-2" />
                    حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>

          {comment.imageBase64 && (
            <div className="mt-2 rounded-xl overflow-hidden border border-border/50">
              <img
                src={`data:image/jpeg;base64,${comment.imageBase64}`}
                alt="صورة"
                className="w-full max-h-60 object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-2">
            <button onClick={onReply.bind(null, comment)} className="text-muted-foreground hover:text-sky-400 transition-colors">
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${
                isLiked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500' : ''}`} />
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
            </button>
          </div>

          {/* Show replies toggle */}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-sky-400 text-xs mt-1 hover:underline"
            >
              {showReplies ? 'إخفاء الردود' : `عرض ${replies.length} رد`}
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                author={replyAuthors[reply.userId] || null}
                currentUserId={currentUserId}
                onReply={onReply}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PostDetailView() {
  const { user, userData } = useAuth();
  const currentUserId = user?.uid || null;
  const { selectedPostId, goBack, setViewParams, navigate } = useAppStore();

  const [post, setPost] = useState<PostData | null>(null);
  const [author, setAuthor] = useState<UserData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentData | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch post
  useEffect(() => {
    if (!selectedPostId) return;
    const postRef = ref(db, `posts/${selectedPostId}`);
    const unsub = onValue(postRef, (snap) => {
      if (snap.exists()) {
        setPost(snap.val() as PostData);
      }
      setLoading(false);
    });
    return () => off(postRef);
  }, [selectedPostId]);

  // Fetch author
  useEffect(() => {
    if (!post?.userId) return;
    const userRef = ref(db, `users/${post.userId}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) setAuthor(snap.val() as UserData);
    });
    return () => off(userRef);
  }, [post?.userId]);

  // Fetch comments (real-time)
  useEffect(() => {
    if (!selectedPostId) return;
    const commentsRef = query(ref(db, 'comments'), orderByChild('postId'), equalTo(selectedPostId));
    const unsub = onValue(commentsRef, (snap) => {
      if (!snap.exists()) {
        setComments([]);
        return;
      }
      const data = snap.val() as Record<string, CommentData>;
      const allComments = Object.values(data)
        .filter((c) => !c.isDeleted && !c.parentId)
        .sort((a, b) => b.timestamp - a.timestamp);
      setComments(allComments);

      // Fetch authors for comments
      allComments.forEach(async (c) => {
        if (commentAuthors[c.userId]) return;
        try {
          const s = await get(ref(db, `users/${c.userId}`));
          if (s.exists()) {
            setCommentAuthors((prev) => ({ ...prev, [c.userId]: s.val() as UserData }));
          }
        } catch { /* ignore */ }
      });
    });
    return () => off(commentsRef);
  }, [selectedPostId, commentAuthors]);

  const handleCommentImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCommentImage(result.split(',')[1] || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !currentUserId || !selectedPostId) return;
    setIsSubmitting(true);
    try {
      const commentData: Partial<CommentData> = {
        postId: selectedPostId,
        userId: currentUserId,
        content: commentText.trim(),
        imageBase64: commentImage,
        timestamp: Date.now(),
        likesCount: 0,
        parentId: replyTo?.id || null,
        isDeleted: false,
      };
      const commentRef = push(ref(db, 'comments'));
      await firebaseSet(ref(db, `comments/${commentRef.key}`), {
        ...commentData,
        id: commentRef.key,
      });

      // Increment commentsCount
      const snap = await get(ref(db, `posts/${selectedPostId}/commentsCount`));
      await update(ref(db, `posts/${selectedPostId}`), {
        commentsCount: (snap.val() || 0) + 1,
      });

      setCommentText('');
      setCommentImage('');
      setReplyTo(null);
      toast.success('تم نشر التعليق');
    } catch {
      toast.error('فشل في نشر التعليق');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (comment: CommentData) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="border-b border-border/50 px-4 py-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>المنشور غير موجود</p>
        <Button variant="outline" className="mt-3" onClick={goBack}>
          العودة
        </Button>
      </div>
    );
  }

  const topComments = comments.filter((c) => !c.parentId);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">التغريدة</h1>
        </div>
      </div>

      {/* Post */}
      <PostCard post={post} author={author} />

      {/* Stats */}
      <div className="flex items-center justify-around px-8 py-3 border-b border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Repeat2 className="h-4 w-4" />
          <span>{formatNumber(post.repostsCount || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Heart className="h-4 w-4" />
          <span>{formatNumber(post.likesCount || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Bookmark className="h-4 w-4" />
          <span>{formatNumber(post.bookmarksCount || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Eye className="h-4 w-4" />
          <span>{formatNumber(post.viewsCount || 0)}</span>
        </div>
      </div>

      <Separator />

      {/* Comments Section */}
      <div className="px-4 py-3">
        <h3 className="text-lg font-bold">
          الردود
          {post.commentsCount > 0 && (
            <span className="text-muted-foreground font-normal mr-1">
              {post.commentsCount}
            </span>
          )}
        </h3>
      </div>

      {/* Comment Input */}
      <div className="border-b border-border/50 px-4 pb-3">
        <div className="flex gap-3">
          <div className="shrink-0">
            {userData?.avatarBase64 ? (
              <img
                src={`data:image/jpeg;base64,${userData.avatarBase64}`}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {userData?.fullName?.charAt(0) || 'م'}
              </div>
            )}
          </div>

          <div className="flex-1">
            {replyTo && (
              <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
                <span>ردًا على @{commentAuthors[replyTo.userId]?.username || 'user'}</span>
                <button onClick={() => setReplyTo(null)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <Textarea
              ref={inputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="أضف تعليقًا..."
              className="resize-none border-0 bg-transparent text-sm focus-visible:ring-0 p-0 min-h-[36px]"
              rows={2}
              dir="rtl"
            />

            {commentImage && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-border/50 inline-block">
                <img
                  src={`data:image/jpeg;base64,${commentImage}`}
                  alt=""
                  className="w-full max-h-32 object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60"
                  onClick={() => setCommentImage('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex gap-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCommentImage}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sky-400 hover:text-sky-300 hover:bg-sky-400/10"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>

              <Button
                size="sm"
                className="rounded-full px-4"
                disabled={!commentText.trim() || isSubmitting}
                onClick={handleSubmitComment}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {topComments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">كن أول من يعلّق</p>
        </motion.div>
      ) : (
        <AnimatePresence>
          {topComments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CommentItem
                comment={comment}
                author={commentAuthors[comment.userId] || null}
                currentUserId={currentUserId}
                onReply={handleReply}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}