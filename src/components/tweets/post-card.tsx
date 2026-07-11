'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import type { PostData, UserData } from '@/lib/types';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  MoreHorizontal,
  BadgeCheck,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ref,
  set,
  remove,
  get,
  onValue,
  off,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffDay < 30) return `منذ ${Math.floor(diffDay / 7)} أسبوع`;
  if (diffDay < 365) return `منذ ${Math.floor(diffDay / 30)} شهر`;
  return `منذ ${Math.floor(diffDay / 365)} سنة`;
}

function renderContent(content: string) {
  const parts = content.split(/(#\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span
          key={i}
          className="text-rose-400 hover:text-rose-300 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const store = useAppStore.getState();
            store.setSearchQuery(part);
            store.setComposeOpen(false);
            store.navigate('search-results');
          }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="text-rose-400 hover:text-rose-300 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const store = useAppStore.getState();
            const username = part.slice(1);
            store.setViewParams({ username });
            store.navigate('profile');
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function AvatarDisplay({
  base64,
  name,
  className,
}: {
  base64: string;
  name: string;
  className?: string;
}) {
  if (base64) {
    return (
      <img
        src={`data:image/jpeg;base64,${base64}`}
        alt={name}
        className={`rounded-full object-cover ${className || ''}`}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold ${className || ''}`}
    >
      {name?.charAt(0) || 'م'}
    </div>
  );
}

interface PostCardProps {
  post: PostData;
  author: UserData | null;
}

export function PostCard({ post, author }: PostCardProps) {
  const { user } = useAuth();
  const userId = user?.uid;
  const { navigate, setViewParams, setSelectedPostId, setReplyToPostId, setComposeOpen } =
    useAppStore();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostsCount || 0);

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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !post.id) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));

    try {
      const likeRef = ref(db, `likes/${post.id}/${userId}`);
      if (wasLiked) {
        await remove(likeRef);
        const postRef = ref(db, `posts/${post.id}/likesCount`);
        const snap = await get(postRef);
        const current = snap.val() || 0;
        await update(ref(db, `posts/${post.id}`), { likesCount: Math.max(0, current - 1) });
      } else {
        await set(likeRef, true);
        const postRef = ref(db, `posts/${post.id}/likesCount`);
        const snap = await get(postRef);
        const current = snap.val() || 0;
        await update(ref(db, `posts/${post.id}`), { likesCount: current + 1 });
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      toast.error('حدث خطأ');
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !post.id) return;
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);

    try {
      const bmRef = ref(db, `bookmarks/${userId}/${post.id}`);
      if (wasBookmarked) {
        await remove(bmRef);
        toast.success('تمت الإزالة من المحفوظات');
      } else {
        await set(bmRef, true);
        toast.success('تمت الإضافة إلى المحفوظات');
      }
    } catch {
      setIsBookmarked(wasBookmarked);
      toast.error('حدث خطأ');
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !post.id) return;
    const wasReposted = isReposted;
    setIsReposted(!wasReposted);
    setRepostCount((c) => (wasReposted ? c - 1 : c + 1));

    try {
      const rtRef = ref(db, `reposts/${userId}/${post.id}`);
      if (wasReposted) {
        await remove(rtRef);
        const postRef = ref(db, `posts/${post.id}/repostsCount`);
        const snap = await get(postRef);
        const current = snap.val() || 0;
        await update(ref(db, `posts/${post.id}`), { repostsCount: Math.max(0, current - 1) });
      } else {
        await set(rtRef, Date.now());
        const postRef = ref(db, `posts/${post.id}/repostsCount`);
        const snap = await get(postRef);
        const current = snap.val() || 0;
        await update(ref(db, `posts/${post.id}`), { repostsCount: current + 1 });
      }
    } catch {
      setIsReposted(wasReposted);
      setRepostCount((c) => (wasReposted ? c + 1 : c - 1));
      toast.error('حدث خطأ');
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPostId(post.id);
    setReplyToPostId(post.id);
    navigate('post-detail');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: 'منشور من عدن تويتر', text: post.content });
    } else {
      navigator.clipboard.writeText(post.content);
      toast.success('تم نسخ نص المنشور');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.id) return;
    try {
      await update(ref(db, `posts/${post.id}`), { isDeleted: true });
      toast.success('تم حذف المنشور');
    } catch {
      toast.error('فشل في حذف المنشور');
    }
  };

  const handlePostClick = () => {
    setSelectedPostId(post.id);
    navigate('post-detail');
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.userId) {
      setViewParams({ userId: post.userId });
      navigate('profile');
    }
  };

  const authorName = author?.fullName || 'مستخدم';
  const authorUsername = author?.username || 'user';
  const authorAvatar = author?.avatarBase64 || '';
  const isOwn = userId === post.userId;

  return (
    <article
      className="border-b border-border/50 px-4 py-3 transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={handlePostClick}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <button className="shrink-0" onClick={handleProfileClick}>
          <AvatarDisplay
            base64={authorAvatar}
            name={authorName}
            className="h-10 w-10"
          />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-bold text-sm truncate hover:underline cursor-pointer"
                onClick={handleProfileClick}
              >
                {authorName}
              </span>
              {author?.isVerified && (
                <BadgeCheck className="h-4 w-4 text-rose-400 fill-rose-400 shrink-0" />
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
                <DropdownMenuItem onClick={handleBookmark}>
                  <Bookmark
                    className={`h-4 w-4 ml-2 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`}
                  />
                  {isBookmarked ? 'إزالة من المحفوظات' : 'إضافة إلى المحفوظات'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 ml-2" />
                  مشاركة
                </DropdownMenuItem>
                {isOwn && (
                  <DropdownMenuItem
                    className="text-rose-500 focus:text-rose-500"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    حذف المنشور
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Text content */}
          <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(post.content)}
          </div>

          {/* Image */}
          {post.imageBase64 && (
            <div
              className="mt-3 rounded-2xl overflow-hidden border border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`data:image/jpeg;base64,${post.imageBase64}`}
                alt="صورة المنشور"
                className="w-full max-h-80 object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 max-w-md -mr-2">
            {/* Comment */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10"
              onClick={handleComment}
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentsCount > 0 && (
                <span className="text-xs mr-1">{post.commentsCount}</span>
              )}
            </Button>

            {/* Repost */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 px-2 hover:bg-emerald-400/10 ${
                isReposted
                  ? 'text-emerald-400'
                  : 'text-muted-foreground hover:text-emerald-400'
              }`}
              onClick={handleRepost}
            >
              <Repeat2 className={`h-4 w-4 ${isReposted ? 'fill-emerald-400' : ''}`} />
              {repostCount > 0 && (
                <span className="text-xs mr-1">{repostCount}</span>
              )}
            </Button>

            {/* Like */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 px-2 hover:bg-rose-400/10 ${
                isLiked
                  ? 'text-rose-500'
                  : 'text-muted-foreground hover:text-rose-500'
              }`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500' : ''}`} />
              {likeCount > 0 && (
                <span className="text-xs mr-1">{likeCount}</span>
              )}
            </Button>

            {/* Bookmark */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 px-2 hover:bg-amber-400/10 ${
                isBookmarked
                  ? 'text-amber-400'
                  : 'text-muted-foreground hover:text-amber-400'
              }`}
              onClick={handleBookmark}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
            </Button>

            {/* Share */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export { AvatarDisplay, formatRelativeTime, renderContent };