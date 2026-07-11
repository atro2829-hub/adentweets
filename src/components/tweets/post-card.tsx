'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  MoreHorizontal,
  BadgeCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface PostData {
  id: string;
  content: string;
  imageUrls: string;
  likesCount: number;
  commentsCount: number;
  retweetsCount: number;
  viewsCount: number;
  createdAt: string;
  isLiked?: boolean;
  isRetweeted?: boolean;
  isBookmarked?: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    profileImageUrl: string;
    isVerified: boolean;
  };
}

interface PostCardProps {
  post: PostData;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onRetweet?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onClick?: (postId: string) => void;
  compact?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
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
          className="text-sky-400 hover:text-sky-300 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            useAppStore.getState().navigate('search-results', {
              query: part,
              tab: 'الأحدث',
            });
          }}
        >
          {part}
        </span>
      );
    }
    // Handle @mentions
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-sky-400 hover:text-sky-300 cursor-pointer">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function PostCard({
  post,
  onLike,
  onComment,
  onRetweet,
  onBookmark,
  onClick,
  compact = false,
}: PostCardProps) {
  const { session } = useAuth();
  const navigate = useAppStore((s) => s.navigate);
  const [localLike, setLocalLike] = useState(post.isLiked || false);
  const [localRetweet, setLocalRetweet] = useState(post.isRetweeted || false);
  const [localBookmark, setLocalBookmark] = useState(post.isBookmarked || false);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [retweetCount, setRetweetCount] = useState(post.retweetsCount);

  const images = post.imageUrls
    ? post.imageUrls.split(',').filter((u) => u.trim())
    : [];

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !localLike;
    setLocalLike(newState);
    setLikeCount((c) => (newState ? c + 1 : c - 1));
    onLike?.(post.id);
    if (onLike) {
      fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      }).catch(() => {
        setLocalLike(!newState);
        setLikeCount((c) => (newState ? c - 1 : c + 1));
      });
    }
  };

  const handleRetweet = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !localRetweet;
    setLocalRetweet(newState);
    setRetweetCount((c) => (newState ? c + 1 : c - 1));
    onRetweet?.(post.id);
    fetch('/api/posts/retweet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id }),
    }).catch(() => {
      setLocalRetweet(!newState);
      setRetweetCount((c) => (newState ? c - 1 : c + 1));
    });
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !localBookmark;
    setLocalBookmark(newState);
    onBookmark?.(post.id);
    fetch('/api/posts/bookmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id }),
    }).catch(() => {
      setLocalBookmark(!newState);
    });
    toast(newState ? 'تمت الإضافة إلى المرجعيات' : 'تمت الإزالة من المرجعيات');
  };

  const handleClick = () => {
    if (onClick) {
      onClick(post.id);
    } else {
      navigate('post-detail', { postId: post.id });
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComment?.(post.id);
    navigate('post-detail', { postId: post.id });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: 'منشور من عدن تويتر',
        text: post.content,
      });
    } else {
      navigator.clipboard.writeText(post.content);
      toast('تم نسخ نص المنشور');
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isOwnProfile =
      session && session.user?.id === post.user.id;
    if (isOwnProfile) {
      navigate('profile', { userId: post.user.id });
    } else {
      navigate('profile', { userId: post.user.id });
    }
  };

  return (
    <article
      className="border-b border-border/50 px-4 py-3 transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          <Avatar
            className={compact ? 'h-8 w-8' : 'h-10 w-10'}
            onClick={handleProfileClick}
          >
            <AvatarImage src={post.user.profileImageUrl} alt={post.user.fullName} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {post.user.fullName?.charAt(0) || post.user.username.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-bold text-sm truncate hover:underline cursor-pointer"
                onClick={handleProfileClick}
              >
                {post.user.fullName || post.user.username}
              </span>
              {post.user.isVerified && (
                <BadgeCheck className="h-4 w-4 text-sky-400 fill-sky-400 shrink-0" />
              )}
              <span className="text-muted-foreground text-sm truncate">
                @{post.user.username}
              </span>
              <span className="text-muted-foreground text-sm shrink-0">·</span>
              <span className="text-muted-foreground text-sm shrink-0">
                {formatRelativeTime(post.createdAt)}
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmark(e as unknown as React.MouseEvent);
                  }}
                >
                  <Bookmark className={`h-4 w-4 ml-2 ${localBookmark ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {localBookmark ? 'إزالة من المرجعيات' : 'إضافة إلى المرجعيات'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Share2 className="h-4 w-4 ml-2" />
                  مشاركة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Text content */}
          <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(post.content)}
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div
              className={`mt-3 rounded-2xl overflow-hidden border border-border/50 ${
                images.length === 1 ? 'max-h-80' : 'grid grid-cols-2 gap-0.5'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`صورة ${i + 1}`}
                  className="w-full h-full object-cover"
                  style={images.length === 1 ? { maxHeight: '320px' } : { aspectRatio: '1' }}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          {!compact && (
            <div className="flex items-center justify-between mt-3 max-w-md">
              {/* Comment */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10"
                onClick={handleComment}
              >
                <MessageCircle className="h-4 w-4" />
                {post.commentsCount > 0 && (
                  <span className="text-xs mr-1">{post.commentsCount}</span>
                )}
              </Button>

              {/* Retweet */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 px-2 hover:bg-emerald-400/10 ${
                  localRetweet
                    ? 'text-emerald-400'
                    : 'text-muted-foreground hover:text-emerald-400'
                }`}
                onClick={handleRetweet}
              >
                <Repeat2 className={`h-4 w-4 ${localRetweet ? 'fill-emerald-400' : ''}`} />
                {retweetCount > 0 && (
                  <span className="text-xs mr-1">{retweetCount}</span>
                )}
              </Button>

              {/* Like */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 px-2 hover:bg-rose-400/10 ${
                  localLike
                    ? 'text-rose-500'
                    : 'text-muted-foreground hover:text-rose-500'
                }`}
                onClick={handleLike}
              >
                <Heart className={`h-4 w-4 ${localLike ? 'fill-rose-500' : ''}`} />
                {likeCount > 0 && (
                  <span className="text-xs mr-1">{likeCount}</span>
                )}
              </Button>

              {/* Share */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>

              {/* Bookmark */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 px-2 hover:bg-amber-400/10 ${
                  localBookmark
                    ? 'text-amber-400'
                    : 'text-muted-foreground hover:text-amber-400'
                }`}
                onClick={handleBookmark}
              >
                <Bookmark className={`h-4 w-4 ${localBookmark ? 'fill-amber-400' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}