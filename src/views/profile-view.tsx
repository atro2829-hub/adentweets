'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { PostCard } from '@/components/tweets/post-card';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  MapPin,
  Link as LinkIcon,
  Calendar,
  MoreHorizontal,
  MessageCircle,
  Users,
  UserPlus,
  UserMinus,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ref,
  get,
  set,
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
import type { PostData, UserData } from '@/lib/types';

const TABS = [
  { key: 'posts', label: 'التغريدات' },
  { key: 'replies', label: 'الردود' },
  { key: 'reposts', label: 'الإعادات' },
  { key: 'likes', label: 'الإعجابات' },
] as const;

type ProfileTab = (typeof TABS)[number]['key'];

function CountUp({ target, duration = 600 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const targetRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    targetRef.current = target;
    if (target === 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setCount(0));
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * targetRef.current));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return <span>{formatNumber(count)}</span>;
}

export function ProfileView() {
  const { user, userData } = useAuth();
  const currentUserId = user?.uid || null;
  const { viewParams, navigate, goBack, setUserList } = useAppStore();

  const profileUserId = viewParams?.userId || currentUserId;
  const isOwn = profileUserId === currentUserId;

  const [profileUser, setProfileUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  // Post data for tabs
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [replies, setReplies] = useState<PostData[]>([]);
  const [repostIds, setRepostIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [authorsCache, setAuthorsCache] = useState<Record<string, UserData>>({});

  // Banner parallax
  const bannerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const bannerY = useTransform(scrollY, [0, 200], [0, 80]);
  const bannerOpacity = useTransform(scrollY, [0, 150], [1, 0.3]);

  // Fetch profile user data
  useEffect(() => {
    if (!profileUserId) return;
    const userRef = ref(db, `users/${profileUserId}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        setProfileUser(snap.val() as UserData);
      }
      setLoading(false);
    });
    return () => off(userRef);
  }, [profileUserId]);

  // Check follow status
  useEffect(() => {
    if (!currentUserId || !profileUserId || isOwn) return;
    const followRef = ref(db, `follows/${currentUserId}/${profileUserId}`);
    const unsub = onValue(followRef, (snap) => {
      setIsFollowing(!!snap.val());
    });
    return () => off(followRef);
  }, [currentUserId, profileUserId, isOwn]);

  // Fetch user posts (real-time)
  useEffect(() => {
    if (!profileUserId) return;
    const postsRef = query(ref(db, 'posts'), orderByChild('userId'), equalTo(profileUserId));
    const unsub = onValue(postsRef, (snap) => {
      if (!snap.exists()) {
        setUserPosts([]);
        return;
      }
      const data = snap.val() as Record<string, PostData>;
      const sorted = Object.values(data)
        .filter((p) => !p.isDeleted)
        .sort((a, b) => b.timestamp - a.timestamp);
      setUserPosts(sorted);
    });
    return () => off(postsRef);
  }, [profileUserId]);

  // Fetch replies (comments by user)
  useEffect(() => {
    if (!profileUserId) return;
    const commentsRef = query(ref(db, 'comments'), orderByChild('userId'), equalTo(profileUserId));
    const unsub = onValue(commentsRef, (snap) => {
      if (!snap.exists()) {
        setReplies([]);
        return;
      }
      const data = snap.val() as Record<string, { postId: string; userId: string; timestamp: number; content: string; imageBase64: string; isDeleted: boolean; likesCount: number }>;
      const allReplies = Object.values(data).filter((c) => !c.isDeleted);
      // Fetch post data for each reply
      const replyPosts: PostData[] = [];
      const promises = allReplies.map(async (comment) => {
        try {
          const postSnap = await get(ref(db, `posts/${comment.postId}`));
          if (postSnap.exists()) {
            const post = postSnap.val() as PostData;
            replyPosts.push({ ...post, content: comment.content, imageBase64: comment.imageBase64 });
          }
        } catch { /* ignore */ }
      });
      Promise.all(promises).then(() => setReplies(replyPosts));
    });
    return () => off(commentsRef);
  }, [profileUserId]);

  // Fetch repost IDs
  useEffect(() => {
    if (!profileUserId) return;
    const repostsRef = ref(db, `reposts/${profileUserId}`);
    const unsub = onValue(repostsRef, (snap) => {
      if (!snap.exists()) {
        setRepostIds([]);
        return;
      }
      setRepostIds(Object.keys(snap.val()));
    });
    return () => off(repostsRef);
  }, [profileUserId]);

  // Fetch liked post IDs
  useEffect(() => {
    if (!profileUserId) return;
    const likesRef = ref(db, `likes`);
    // We need to iterate - but RTDB can't query by child value across all posts
    // Instead, store likes per post; let's check userLikes node if it exists
    const userLikesRef = ref(db, `userLikes/${profileUserId}`);
    const unsub = onValue(userLikesRef, (snap) => {
      if (!snap.exists()) {
        setLikedPostIds([]);
        return;
      }
      setLikedPostIds(Object.keys(snap.val()));
    });
    return () => off(userLikesRef);
  }, [profileUserId]);

  // Fetch repost/liked post data
  useEffect(() => {
    const idsToFetch = [...new Set([...repostIds, ...likedPostIds])];
    if (idsToFetch.length === 0) return;

    const fetchPosts = async () => {
      const results: PostData[] = [];
      const authorIds = new Set<string>();
      for (const id of idsToFetch) {
        try {
          const snap = await get(ref(db, `posts/${id}`));
          if (snap.exists()) {
            const post = snap.val() as PostData;
            if (!post.isDeleted) {
              results.push(post);
              authorIds.add(post.userId);
            }
          }
        } catch { /* ignore */ }
      }
      results.sort((a, b) => b.timestamp - a.timestamp);

      // Cache authors
      for (const uid of authorIds) {
        if (!authorsCache[uid]) {
          try {
            const snap = await get(ref(db, `users/${uid}`));
            if (snap.exists()) {
              setAuthorsCache((prev) => ({ ...prev, [uid]: snap.val() as UserData }));
            }
          } catch { /* ignore */ }
        }
      }
    };
    fetchPosts();
  }, [repostIds, likedPostIds, authorsCache]);

  // Follow / Unfollow
  const handleFollow = async () => {
    if (!currentUserId || !profileUserId || isOwn) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await remove(ref(db, `follows/${currentUserId}/${profileUserId}`));
        await remove(ref(db, `followers/${profileUserId}/${currentUserId}`));
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        const rSnap = await get(ref(db, `users/${profileUserId}/followersCount`));
        await update(ref(db, `users/${currentUserId}`), {
          followingCount: Math.max(0, (fSnap.val() || 0) - 1),
        });
        await update(ref(db, `users/${profileUserId}`), {
          followersCount: Math.max(0, (rSnap.val() || 0) - 1),
        });
      } else {
        await set(ref(db, `follows/${currentUserId}/${profileUserId}`), true);
        await set(ref(db, `followers/${profileUserId}/${currentUserId}`), true);
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        const rSnap = await get(ref(db, `users/${profileUserId}/followersCount`));
        await update(ref(db, `users/${currentUserId}`), {
          followingCount: (fSnap.val() || 0) + 1,
        });
        await update(ref(db, `users/${profileUserId}`), {
          followersCount: (rSnap.val() || 0) + 1,
        });
      }
    } catch {
      setIsFollowing(wasFollowing);
      toast.error('حدث خطأ');
    }
  };

  // Stats click handler
  const handleStatClick = (type: 'followers' | 'following' | 'likes' | 'reposts') => {
    if (!profileUserId) return;
    setUserList(type, profileUserId);
    navigate('user-list');
  };

  // Get display posts for active tab
  const displayPosts = useMemo(() => {
    if (activeTab === 'posts') {
      // Pinned post first
      const pinned = userPosts.filter((p) => p.isPinned);
      const regular = userPosts.filter((p) => !p.isPinned);
      return [...pinned, ...regular];
    }
    return [];
  }, [activeTab, userPosts]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-[150px] w-full" />
        <div className="px-4 -mt-10 relative">
          <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>المستخدم غير موجود</p>
      </div>
    );
  }

  const joinDate = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div ref={bannerRef} className="relative h-[150px] overflow-hidden">
        <motion.div style={{ y: bannerY, opacity: bannerOpacity }} className="absolute inset-0">
          {profileUser.bannerBase64 ? (
            <img
              src={`data:image/jpeg;base64,${profileUser.bannerBase64}`}
              alt="الغلاف"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-bl from-sky-600 via-purple-600 to-rose-600" />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </motion.div>

        {/* Back button */}
        {!isOwn && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60"
            onClick={goBack}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Avatar + Actions */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="flex items-end justify-between">
          <div className="border-4 border-background rounded-full shadow-lg overflow-hidden">
            {profileUser.avatarBase64 ? (
              <img
                src={`data:image/jpeg;base64,${profileUser.avatarBase64}`}
                alt={profileUser.fullName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                {profileUser.fullName?.charAt(0) || 'م'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pb-2">
            {isOwn ? (
              <Button
                variant="outline"
                className="rounded-full text-sm font-bold px-5"
                onClick={() => navigate('edit-profile')}
              >
                <Pencil className="h-4 w-4 ml-1.5" />
                تعديل الملف الشخصي
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-9 w-9"
                  onClick={() => {
                    // Message navigation would go here
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-9 w-9"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={isFollowing ? 'outline' : 'default'}
                    className="rounded-full text-sm font-bold px-5"
                    onClick={handleFollow}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 ml-1.5" />
                        إلغاء المتابعة
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 ml-1.5" />
                        متابعة
                      </>
                    )}
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* User Info */}
        <motion.div
          className="mt-3 space-y-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-bold">{profileUser.fullName}</h2>
            <VerificationBadge type={profileUser.verificationType || 'none'} size="md" />
          </div>
          <p className="text-muted-foreground text-sm">@{profileUser.username}</p>
        </motion.div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{profileUser.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-muted-foreground text-sm">
          {profileUser.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {profileUser.location}
            </span>
          )}
          {profileUser.website && (
            <a
              href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sky-400 hover:underline"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {profileUser.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {profileUser.birthDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(profileUser.birthDate).toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {joinDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              انضم في {joinDate}
            </span>
          )}
        </div>

        {/* Stats */}
        <motion.div
          className="flex items-center gap-5 mt-3 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            className="hover:underline"
            onClick={() => handleStatClick('following')}
          >
            <span className="font-bold">
              <CountUp target={profileUser.followingCount || 0} />
            </span>{' '}
            <span className="text-muted-foreground">يُتابِع</span>
          </button>
          <button
            className="hover:underline"
            onClick={() => handleStatClick('followers')}
          >
            <span className="font-bold">
              <CountUp target={profileUser.followersCount || 0} />
            </span>{' '}
            <span className="text-muted-foreground">متابِع</span>
          </button>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-border/50 relative">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-3 text-center text-sm font-medium transition-colors"
          >
            <span className={activeTab === tab.key ? 'font-bold text-foreground' : 'text-muted-foreground'}>
              {tab.label}
            </span>
            {activeTab === tab.key && (
              <motion.div
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        <AnimatePresence mode="wait">
          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {displayPosts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  لا توجد تغريدات بعد
                </div>
              ) : (
                displayPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    author={isOwn ? userData : profileUser}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'replies' && (
            <motion.div
              key="replies"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {replies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  لا توجد ردود بعد
                </div>
              ) : (
                replies.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    author={authorsCache[post.userId] || null}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'reposts' && (
            <motion.div
              key="reposts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {repostIds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  لا توجد إعادات بعد
                </div>
              ) : (
                repostIds.slice(0, 20).map((id) => {
                  const post = userPosts.find((p) => p.id === id);
                  if (!post) return null;
                  return (
                    <PostCard
                      key={id}
                      post={post}
                      author={authorsCache[post.userId] || null}
                    />
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'likes' && (
            <motion.div
              key="likes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {likedPostIds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  لا توجد إعجابات بعد
                </div>
              ) : (
                likedPostIds.slice(0, 20).map((id) => {
                  const post = userPosts.find((p) => p.id === id);
                  if (!post) return null;
                  return (
                    <PostCard
                      key={id}
                      post={post}
                      author={authorsCache[post.userId] || null}
                    />
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}