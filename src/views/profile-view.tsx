'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard, PostData } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import {
  ArrowRight,
  Edit3,
  MapPin,
  Link as LinkIcon,
  Calendar,
  BadgeCheck,
  Mail,
  MessageCircle,
} from 'lucide-react';

interface ProfileData {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  location: string;
  website: string;
  profileImageUrl: string;
  bannerImageUrl: string;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}م`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}ك`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
  });
}

export function ProfileView() {
  const { viewParams, navigate } = useAppStore();
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const currentUsername = session?.user?.username;
  const username = viewParams.username || currentUsername || '';

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('المنشورات');
  const [followLoading, setFollowLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const [pRes, postsRes] = await Promise.all([
        fetch(`/api/users/${username}`),
        fetch(`/api/posts?username=${username}&limit=20`),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(pData);
      }
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }
    } catch {
      // empty
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: profile.id }),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: !prev.isFollowing,
              followersCount: prev.isFollowing
                ? prev.followersCount - 1
                : prev.followersCount + 1,
            }
          : null
      );
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: profile.id, content: '' }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate('chat', { conversationId: data.conversationId || '' });
      }
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-36 w-full" />
        <div className="px-4 -mt-12">
          <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-6 px-4 mt-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-muted-foreground">لم يتم العثور على المستخدم</p>
      </div>
    );
  }

  const isOwn = currentUserId === profile.id;

  return (
    <div>
      {/* Banner */}
      <div className="relative">
        {profile.bannerImageUrl ? (
          <img
            src={profile.bannerImageUrl}
            alt="الغلاف"
            className="w-full h-32 sm:h-48 object-cover"
          />
        ) : (
          <div className="w-full h-32 sm:h-48 bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="px-4">
        {/* Avatar + Actions */}
        <div className="flex justify-between items-end -mt-12 mb-3">
          <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background">
            <AvatarImage src={profile.profileImageUrl} alt={profile.fullName} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl">
              {profile.fullName?.charAt(0) || profile.username.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex gap-2">
            {isOwn ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 px-4 text-sm font-bold"
                onClick={() => navigate('edit-profile')}
              >
                <Edit3 className="h-4 w-4 ml-1.5" />
                تعديل الملف
              </Button>
            ) : (
              <>
                <Button
                  variant={profile.isFollowing ? 'outline' : 'default'}
                  size="sm"
                  className="rounded-full h-8 px-4 text-sm font-bold"
                  disabled={followLoading}
                  onClick={handleFollow}
                >
                  {followLoading
                    ? '...'
                    : profile.isFollowing
                      ? 'إلغاء المتابعة'
                      : 'متابعة'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 px-3"
                  onClick={handleMessage}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Name & Username */}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold">{profile.fullName || profile.username}</h1>
            {profile.isVerified && (
              <BadgeCheck className="h-5 w-5 text-sky-400 fill-sky-400" />
            )}
          </div>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && <p className="mt-3 text-sm whitespace-pre-wrap">{profile.bio}</p>}

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            انضم في {formatDate(profile.createdAt)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-sm">
          <button
            className="hover:underline"
            onClick={() => navigate('user-list', { userId: profile.id, type: 'following' })}
          >
            <span className="font-bold">{formatNumber(profile.followingCount)}</span>{' '}
            <span className="text-muted-foreground">متابَعين</span>
          </button>
          <button
            className="hover:underline"
            onClick={() => navigate('user-list', { userId: profile.id, type: 'followers' })}
          >
            <span className="font-bold">{formatNumber(profile.followersCount)}</span>{' '}
            <span className="text-muted-foreground">متابِع</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-3 border-b border-border/50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-12 bg-transparent p-0">
            <TabsTrigger
              value="المنشورات"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              المنشورات
            </TabsTrigger>
            <TabsTrigger
              value="الردود"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الردود
            </TabsTrigger>
            <TabsTrigger
              value="الإعجابات"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الإعجابات
            </TabsTrigger>
            <TabsTrigger
              value="المرجعيات"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              المرجعيات
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <p className="text-sm text-muted-foreground">لا توجد منشورات بعد</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}