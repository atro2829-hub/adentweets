'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import {
  ArrowRight,
  Edit3,
  Calendar,
  BadgeCheck,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PostData, UserData } from '@/lib/types';
import {
  ref,
  onValue,
  off,
  set,
  remove,
  get,
  update,
  query,
  orderByChild,
  limitToLast,
  equalTo,
} from 'firebase/database';
import { db } from '@/lib/firebase';

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}م`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}ك`;
  return n.toString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
  });
}

export function ProfileView() {
  const { viewParams, navigate, setViewParams, goBack, setUserList } = useAppStore();
  const { user, userData: currentUserData } = useAuth();
  const currentUserId = user?.uid;
  const targetUserId = viewParams.userId || currentUserId || '';

  const [profile, setProfile] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch profile data
  useEffect(() => {
    if (!targetUserId) return;
    const userRef = ref(db, `users/${targetUserId}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.val());
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });
    return () => off(userRef);
  }, [targetUserId]);

  // Check if following
  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;
    const followRef = ref(db, `follows/${currentUserId}/${targetUserId}`);
    const unsub = onValue(followRef, (snap) => {
      setIsFollowing(!!snap.val());
    });
    return () => off(followRef);
  }, [currentUserId, targetUserId]);

  // Fetch user's posts
  useEffect(() => {
    if (!targetUserId) return;
    const postsQuery = query(
      ref(db, 'posts'),
      orderByChild('userId'),
      equalTo(targetUserId)
    );

    const unsub = onValue(postsQuery, async (snap) => {
      if (!snap.exists()) {
        setPosts([]);
        return;
      }
      const data = snap.val() as Record<string, PostData>;
      const userPosts: PostData[] = Object.values(data)
        .filter((p) => !p.isDeleted)
        .sort((a, b) => b.timestamp - a.timestamp);

      setPosts(userPosts);

      // Fetch author for posts (should be same user, but for PostCard compat)
      const aSnap = await get(ref(db, `users/${targetUserId}`));
      if (aSnap.exists()) {
        setAuthors({ [targetUserId]: aSnap.val() });
      }
    });

    return () => off(postsQuery);
  }, [targetUserId]);

  const handleFollow = async () => {
    if (!currentUserId || !targetUserId || followLoading) return;
    setFollowLoading(true);

    try {
      const followRef = ref(db, `follows/${currentUserId}/${targetUserId}`);
      const followerRef = ref(db, `follows/${targetUserId}/${currentUserId}`);

      if (isFollowing) {
        await remove(followRef);
        // Decrement counts
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        await update(ref(db, `users/${currentUserId}`), {
          followingCount: Math.max(0, (fSnap.val() || 0) - 1),
        });
        const fsSnap = await get(ref(db, `users/${targetUserId}/followersCount`));
        await update(ref(db, `users/${targetUserId}`), {
          followersCount: Math.max(0, (fsSnap.val() || 0) - 1),
        });
        toast.success('تم إلغاء المتابعة');
      } else {
        await set(followRef, Date.now());
        // Increment counts
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        await update(ref(db, `users/${currentUserId}`), {
          followingCount: (fSnap.val() || 0) + 1,
        });
        const fsSnap = await get(ref(db, `users/${targetUserId}/followersCount`));
        await update(ref(db, `users/${targetUserId}`), {
          followersCount: (fsSnap.val() || 0) + 1,
        });
        toast.success('تمت المتابعة');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    // Create or find conversation and navigate
    toast.info('ميزة الرسائل قيد التطوير');
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

  const isOwn = currentUserId === targetUserId;
  const avatar = profile.avatarBase64 || '';
  const banner = profile.bannerBase64 || '';

  return (
    <div>
      {/* Back button on mobile */}
      {viewParams.userId && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3 lg:hidden">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">{profile.fullName}</h1>
        </div>
      )}

      {/* Banner */}
      <div className="relative">
        {banner ? (
          <img
            src={`data:image/jpeg;base64,${banner}`}
            alt="الغلاف"
            className="w-full h-32 sm:h-48 object-cover"
          />
        ) : (
          <div className="w-full h-32 sm:h-48 bg-gradient-to-br from-rose-900/40 via-background to-amber-900/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="px-4">
        {/* Avatar + Actions */}
        <div className="flex justify-between items-end -mt-12 mb-3">
          <div className="h-20 w-20 md:h-24 md:w-24 border-4 border-background rounded-full overflow-hidden">
            {avatar ? (
              <img
                src={`data:image/jpeg;base64,${avatar}`}
                alt={profile.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                {profile.fullName?.charAt(0) || profile.username.charAt(0)}
              </div>
            )}
          </div>

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
                  variant={isFollowing ? 'outline' : 'default'}
                  size="sm"
                  className="rounded-full h-8 px-4 text-sm font-bold"
                  disabled={followLoading}
                  onClick={handleFollow}
                >
                  {followLoading
                    ? '...'
                    : isFollowing
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
              <BadgeCheck className="h-5 w-5 text-rose-400 fill-rose-400" />
            )}
          </div>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && <p className="mt-3 text-sm whitespace-pre-wrap">{profile.bio}</p>}

        {/* Join Date */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            انضم في {formatDate(profile.createdAt)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-sm">
          <button
            className="hover:underline"
            onClick={() => {
              setUserList('following', targetUserId);
              navigate('user-list');
            }}
          >
            <span className="font-bold">{formatNumber(profile.followingCount)}</span>{' '}
            <span className="text-muted-foreground">متابَعين</span>
          </button>
          <button
            className="hover:underline"
            onClick={() => {
              setUserList('followers', targetUserId);
              navigate('user-list');
            }}
          >
            <span className="font-bold">{formatNumber(profile.followersCount)}</span>{' '}
            <span className="text-muted-foreground">متابِع</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-border/50 mt-3" />

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <p className="text-sm text-muted-foreground">لا توجد منشورات بعد</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            author={authors[post.userId] || null}
          />
        ))
      )}
    </div>
  );
}