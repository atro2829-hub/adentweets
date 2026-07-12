'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import type { PostData, UserData } from '@/lib/types';
import { VerificationBadge } from '@/components/layout/verification-badge';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  MoreHorizontal,
  BarChart3,
  Trash2,
  Flag,
  Copy,
  Quote,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ref,
  set,
  remove,
  get,
  onValue,
  off,
  update,
  push,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { cn, formatRelativeTime, formatNumber, highlightContent } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

function AvatarCircle({ base64, name, className, onClick }: { base64: string; name: string; className?: string; onClick?: () => void }) {
  const inner = base64 ? (
    <img
      src={`data:image/jpeg;base64,${base64}`}
      alt={name}
      className={cn('rounded-full object-cover', className)}
    />
  ) : (
    <div
      className={cn(
        'rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0',
        className
      )}
    >
      {name?.charAt(0) || 'م'}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="shrink-0" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {inner}
      </button>
    );
  }
  return inner;
}

function QuoteTweetPreview({ quotePostId }: { quotePostId: string }) {
  const [quotePost, setQuotePost] = useState<PostData | null>(null);
  const [quoteAuthor, setQuoteAuthor] = useState<UserData | null>(null);

  useEffect(() => {
    if (!quotePostId) return;
    const postRef = ref(db, `posts/${quotePostId}`);
    get(postRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val() as PostData;
        setQuotePost(data);
        // Fetch author
        if (data.userId) {
          get(ref(db, `users/${data.userId}`)).then((userSnap) => {
            if (userSnap.exists()) {
              setQuoteAuthor(userSnap.val() as UserData);
            }
          });
        }
      }
    });
  }, [quotePostId]);

  if (!quotePost) return null;

  const aName = quoteAuthor?.fullName || 'مستخدم';
  const aUsername = quoteAuthor?.username || 'user';
  const aAvatar = quoteAuthor?.avatarBase64 || '';

  return (
    <div
      className="mt-2 rounded-2xl border border-border/50 p-3 hover:bg-accent/20 cursor-pointer transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        const store = useAppStore.getState();
        store.setSelectedPostId(quotePostId);
        store.navigate('post-detail');
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <AvatarCircle base64={aAvatar} name={aName} className="h-5 w-5" />
        <span className="text-xs font-bold truncate">{aName}</span>
        {quoteAuthor?.isVerified && (
          <VerificationBadge type={quoteAuthor.verificationType || 'blue'} size="sm" />
        )}
        <span className="text-xs text-muted-foreground truncate">@{aUsername}</span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {quotePost.content}
      </p>
    </div>
  );
}

interface PostCardProps {
  post: PostData;
  author: UserData | null;
  showActions?: boolean;
}

export function PostCard({ post, author, showActions = true }: PostCardProps) {
  const { user } = useAuth();
  const userId = user?.uid;
  const {
    navigate,
    setViewParams,
    setSelectedPostId,
    setReplyToPostId,
    setComposeOpen,
    setQuotePostId,
    setMediaViewerImages,
    setMediaViewerIndex,
  } = useAppStore();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostsCount || 0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reposterData, setReposterData] = useState<UserData | null>(null);

  // Check like status
  useEffect(() => {
    if (!userId || !post.id) return;
    const likeRef = ref(db, `likes/${post.id}/${userId}`);
    const unsub = onValue(likeRef, (snap) => {
      setIsLiked(!!snap.val());
    });
    return () => off(likeRef);
  }, [userId, post.id]);

  // Check bookmark status
  useEffect(() => {
    if (!userId || !post.id) return;
    const bmRef = ref(db, `bookmarks/${userId}/${post.id}`);
    const unsub = onValue(bmRef, (snap) => {
      setIsBookmarked(!!snap.val());
    });
    return () => off(bmRef);
  }, [userId, post.id]);

  // Check repost status
  useEffect(() => {
    if (!userId || !post.id) return;
    const rtRef = ref(db, `reposts/${userId}/${post.id}`);
    const unsub = onValue(rtRef, (snap) => {
      setIsReposted(!!snap.val());
    });
    return () => off(rtRef);
  }, [userId, post.id]);

  // Fetch reposter data
  useEffect(() => {
    if (!post.repostedBy) return;
    get(ref(db, `users/${post.repostedBy}`)).then((snap) => {
      if (snap.exists()) setReposterData(snap.val() as UserData);
    });
  }, [post.repostedBy]);

  // Increment views on first render
  useEffect(() => {
    if (!post.id || post.isDeleted) return;
    const timer = setTimeout(() => {
      const viewsRef = ref(db, `posts/${post.id}/viewsCount`);
      get(viewsRef).then((snap) => {
        const current = snap.val() || 0;
        update(ref(db, `posts/${post.id}`), { viewsCount: current + 1 });
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [post.id]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !post.id) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));

    try {
      const likeRef = ref(db, `likes/${post.id}/${userId}`);
      if (wasLiked) {
        await remove(likeRef);
        const snap = await get(ref(db, `posts/${post.id}/likesCount`));
        await update(ref(db, `posts/${post.id}`), { likesCount: Math.max(0, (snap.val() || 0) - 1) });
      } else {
        await set(likeRef, true);
        const snap = await get(ref(db, `posts/${post.id}/likesCount`));
        await update(ref(db, `posts/${post.id}`), { likesCount: (snap.val() || 0) + 1 });
        // Create notification
        if (post.userId !== userId) {
          const notifRef = push(ref(db, `notifications/${post.userId}`));
          set(notifRef, {
            id: notifRef.key,
            type: 'like',
            actorId: userId,
            postId: post.id,
            commentId: '',
            timestamp: Date.now(),
            isRead: false,
            message: 'أعجب بمنشورك',
          });
        }
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      toast.error('حدث خطأ');
    }
  }, [userId, post.id, post.userId, isLiked]);

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !post.id) return;
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);

    try {
      const bmRef = ref(db, `bookmarks/${userId}/${post.id}`);
      if (wasBookmarked) {
        await remove(bmRef);
      } else {
        await set(bmRef, true);
      }
    } catch {
      setIsBookmarked(wasBookmarked);
      toast.error('حدث خطأ');
    }
  }, [userId, post.id, isBookmarked]);

  const handleRepost = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !post.id) return;
    const wasReposted = isReposted;
    setIsReposted(!wasReposted);
    setRepostCount((c) => (wasReposted ? c - 1 : c + 1));

    try {
      const rtRef = ref(db, `reposts/${userId}/${post.id}`);
      if (wasReposted) {
        await remove(rtRef);
        const snap = await get(ref(db, `posts/${post.id}/repostsCount`));
        await update(ref(db, `posts/${post.id}`), { repostsCount: Math.max(0, (snap.val() || 0) - 1) });
      } else {
        await set(rtRef, Date.now());
        const snap = await get(ref(db, `posts/${post.id}/repostsCount`));
        await update(ref(db, `posts/${post.id}`), { repostsCount: (snap.val() || 0) + 1 });
        // Create notification
        if (post.userId !== userId) {
          const notifRef = push(ref(db, `notifications/${post.userId}`));
          set(notifRef, {
            id: notifRef.key,
            type: 'repost',
            actorId: userId,
            postId: post.id,
            commentId: '',
            timestamp: Date.now(),
            isRead: false,
            message: 'أعاد نشر منشورك',
          });
        }
      }
    } catch {
      setIsReposted(wasReposted);
      setRepostCount((c) => (wasReposted ? c + 1 : c - 1));
      toast.error('حدث خطأ');
    }
  }, [userId, post.id, post.userId, isReposted]);

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPostId(post.id);
    navigate('post-detail');
  };

  const handleDelete = async () => {
    if (!post.id) return;
    try {
      await update(ref(db, `posts/${post.id}`), { isDeleted: true });
      toast.success('تم حذف المنشور');
      setShowDeleteDialog(false);
    } catch {
      toast.error('فشل في حذف المنشور');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://adentweets.app/post/${post.id}`);
    toast.success('تم نسخ الرابط');
  };

  const handleQuote = () => {
    setQuotePostId(post.id);
    setComposeOpen(true);
  };

  const handlePostClick = () => {
    setSelectedPostId(post.id);
    navigate('post-detail');
  };

  const handleProfileClick = () => {
    if (post.userId) {
      setViewParams({ userId: post.userId });
      navigate('profile');
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.imageBase64) {
      setMediaViewerImages([`data:image/jpeg;base64,${post.imageBase64}`]);
      setMediaViewerIndex(0);
      navigate('media-viewer');
    }
  };

  const authorName = author?.fullName || 'مستخدم';
  const authorUsername = author?.username || 'user';
  const authorAvatar = author?.avatarBase64 || '';
  const isOwn = userId === post.userId;

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        className="border-b border-border/50 px-4 py-3 transition-colors hover:bg-accent/30 cursor-pointer"
        onClick={handlePostClick}
      >
        {/* Repost indicator */}
        {post.repostedBy && (
          <div className="flex items-center gap-2 mb-1 mr-12 text-muted-foreground text-xs">
            <Repeat2 className="h-3.5 w-3.5" />
            <span>أعاد {reposterData?.fullName || 'مستخدم'} نشر التغريدة</span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <AvatarCircle
            base64={authorAvatar}
            name={authorName}
            className="h-10 w-10"
            onClick={handleProfileClick}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="font-bold text-sm truncate hover:underline cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleProfileClick(); }}
                >
                  {authorName}
                </span>
                {author?.isVerified && (
                  <VerificationBadge type={author.verificationType || 'blue'} size="sm" />
                )}
                <span className="text-muted-foreground text-sm truncate">
                  @{authorUsername}
                </span>
                <span className="text-muted-foreground text-sm shrink-0">·</span>
                <span className="text-muted-foreground text-sm shrink-0">
                  {formatRelativeTime(post.timestamp)}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}>
                    <Copy className="h-4 w-4 ml-2" />
                    نسخ الرابط
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuote(); }}>
                    <Quote className="h-4 w-4 ml-2" />
                    نقل التغريدة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleBookmark(e as unknown as React.MouseEvent); }}>
                    <Bookmark
                      className={cn('h-4 w-4 ml-2', isBookmarked ? 'fill-amber-400 text-amber-400' : '')}
                    />
                    {isBookmarked ? 'إزالة من المحفوظات' : 'حفظ'}
                  </DropdownMenuItem>
                  {!isOwn && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.success('تم الإبلاغ عن المنشور'); }}>
                      <Flag className="h-4 w-4 ml-2" />
                      إبلاغ
                    </DropdownMenuItem>
                  )}
                  {isOwn && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-500 focus:text-rose-500"
                        onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف المنشور
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Text content */}
            <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {highlightContent(post.content)}
            </div>

            {/* Image */}
            {post.imageBase64 && (
              <div
                className="mt-3 rounded-xl overflow-hidden border border-border/50 max-h-[500px]"
                onClick={handleImageClick}
              >
                <img
                  src={`data:image/jpeg;base64,${post.imageBase64}`}
                  alt="صورة المنشور"
                  className="w-full max-h-[500px] object-cover"
                />
              </div>
            )}

            {/* Quote post */}
            {post.isQuote && post.quotePostId && (
              <QuoteTweetPreview quotePostId={post.quotePostId} />
            )}

            {/* Action bar */}
            {showActions && (
              <div className="flex items-center justify-between mt-3 max-w-[420px] -mr-2">
                {/* Comment */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10 rounded-full"
                  onClick={handleComment}
                >
                  <MessageCircle className="h-[18px] w-[18px]" />
                  {post.commentsCount > 0 && (
                    <span className="text-xs mr-1">{formatNumber(post.commentsCount)}</span>
                  )}
                </Button>

                {/* Repost */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-9 px-2.5 hover:bg-emerald-400/10 rounded-full',
                    isReposted
                      ? 'text-emerald-400'
                      : 'text-muted-foreground hover:text-emerald-400'
                  )}
                  onClick={handleRepost}
                >
                  <Repeat2 className={cn('h-[18px] w-[18px]', isReposted && 'fill-emerald-400')} />
                  {repostCount > 0 && (
                    <span className="text-xs mr-1">{formatNumber(repostCount)}</span>
                  )}
                </Button>

                {/* Like */}
                <motion.button
                  className={cn(
                    'flex items-center gap-1 h-9 px-2.5 rounded-full transition-colors',
                    isLiked
                      ? 'text-rose-500 hover:bg-rose-500/10'
                      : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'
                  )}
                  onClick={handleLike}
                  whileTap={{ scale: 0.85 }}
                >
                  <motion.div
                    animate={isLiked ? { scale: [1, 1.3, 1], rotate: [0, -10, 0] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart className={cn('h-[18px] w-[18px]', isLiked && 'fill-rose-500')} />
                  </motion.div>
                  {likeCount > 0 && (
                    <span className="text-xs">{formatNumber(likeCount)}</span>
                  )}
                </motion.button>

                {/* Views */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10 rounded-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <BarChart3 className="h-[18px] w-[18px]" />
                  {post.viewsCount > 0 && (
                    <span className="text-xs mr-1">{formatNumber(post.viewsCount)}</span>
                  )}
                </Button>

                {/* Bookmark */}
                <motion.button
                  className={cn(
                    'flex items-center h-9 px-2.5 rounded-full transition-colors',
                    isBookmarked
                      ? 'text-amber-400 hover:bg-amber-400/10'
                      : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10'
                  )}
                  onClick={handleBookmark}
                  whileTap={{ scale: 0.85 }}
                >
                  <Bookmark className={cn('h-[18px] w-[18px]', isBookmarked && 'fill-amber-400')} />
                </motion.button>

                {/* Share */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2.5 text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10 rounded-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Share2 className="h-[18px] w-[18px]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}>
                      <Copy className="h-4 w-4 ml-2" />
                      نسخ الرابط
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuote(); }}>
                      <Quote className="h-4 w-4 ml-2" />
                      نقل التغريدة
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </motion.article>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التغريدة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه التغريدة نهائيًا. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="flex-1 rounded-full">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { AvatarCircle, QuoteTweetPreview };