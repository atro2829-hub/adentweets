'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { PostCard } from '@/components/tweets/post-card';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  TrendingUp,
  UserPlus,
  UserMinus,
  Users,
  ChevronLeft,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { formatNumber, extractHashtags } from '@/lib/utils';
import { toast } from 'sonner';
import type { PostData, UserData, TrendingTopic } from '@/lib/types';

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function ExploreView() {
  const { user } = useAuth();
  const userId = user?.uid || null;
  const { setSearchQuery, navigate, setViewParams, setTrendingTopics } = useAppStore();

  const [searchText, setSearchText] = useState('');
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<{ user: UserData; isFollowing: boolean }[]>([]);
  const [popularPosts, setPopularPosts] = useState<PostData[]>([]);
  const [popularAuthors, setPopularAuthors] = useState<Record<string, UserData>>({});
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch following IDs
  useEffect(() => {
    if (!userId) return;
    const followsRef = ref(db, `follows/${userId}`);
    const unsub = onValue(followsRef, (snap) => {
      if (snap.exists()) {
        setFollowingIds(new Set(Object.keys(snap.val())));
      } else {
        setFollowingIds(new Set());
      }
    });
    return () => off(followsRef);
  }, [userId]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch recent posts for trending analysis
        const postsRef = query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(100));
        const postsSnap = await get(postsRef);
        const allPosts: PostData[] = [];
        const hashtagCounts: Record<string, number> = {};

        if (postsSnap.exists()) {
          const data = postsSnap.val() as Record<string, PostData>;
          Object.values(data).forEach((p) => {
            if (!p.isDeleted) {
              allPosts.push(p);
              const tags = extractHashtags(p.content);
              tags.forEach((tag) => {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
              });
            }
          });
        }

        // Build trending
        const trendingTopics: TrendingTopic[] = Object.entries(hashtagCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8)
          .map(([hashtag, count]) => ({
            hashtag,
            count,
            category: count > 5 ? 'رائج جدًا' : count > 2 ? 'رائج' : 'يكتسب شعبية',
          }));

        setTrending(trendingTopics);
        setTrendingTopics(trendingTopics);

        // Popular posts (most likes)
        const popular = allPosts
          .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
          .slice(0, 10);
        setPopularPosts(popular);

        // Fetch popular post authors
        const authorIds = [...new Set(popular.map((p) => p.userId))];
        const authors: Record<string, UserData> = {};
        await Promise.all(
          authorIds.map(async (uid) => {
            try {
              const s = await get(ref(db, `users/${uid}`));
              if (s.exists()) authors[uid] = s.val() as UserData;
            } catch { /* ignore */ }
          })
        );
        setPopularAuthors(authors);
      } catch {
        // Silently fail
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Fetch suggested users (not self, not already following)
  useEffect(() => {
    if (!userId) return;
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.val() as Record<string, UserData>;
      const allUsers = Object.entries(data)
        .filter(([uid, u]) => uid !== userId && !u.isSuspended)
        .map(([, u]) => u);

      // Shuffle and pick 5 not following
      const notFollowing = allUsers.filter((u) => !followingIds.has(u.username) && u.username !== userId);
      const shuffled = notFollowing.sort(() => Math.random() - 0.5).slice(0, 5);

      setSuggestedUsers(
        shuffled.map((u) => ({
          user: u,
          isFollowing: followingIds.has(u.username),
        }))
      );
    });
    return () => off(usersRef);
  }, [userId, followingIds]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    setSearchQuery(searchText.trim());
    navigate('search-results');
  };

  const handleTrendClick = (hashtag: string) => {
    setSearchQuery(hashtag);
    navigate('search-results');
  };

  const handleFollowUser = async (targetUser: UserData, index: number) => {
    if (!userId) return;
    const wasFollowing = suggestedUsers[index].isFollowing;

    // Optimistic update
    setSuggestedUsers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isFollowing: !wasFollowing } : item))
    );

    try {
      // Need to find the uid for this user - we stored username-based but need uid
      const usersSnap = await get(ref(db, 'users'));
      if (usersSnap.exists()) {
        const data = usersSnap.val() as Record<string, UserData>;
        const targetUid = Object.entries(data).find(
          ([, u]) => u.username === targetUser.username
        )?.[0];
        if (!targetUid) return;

        if (wasFollowing) {
          await remove(ref(db, `follows/${userId}/${targetUid}`));
          await remove(ref(db, `followers/${targetUid}/${userId}`));
          const fSnap = await get(ref(db, `users/${userId}/followingCount`));
          const rSnap = await get(ref(db, `users/${targetUid}/followersCount`));
          await update(ref(db, `users/${userId}`), {
            followingCount: Math.max(0, (fSnap.val() || 0) - 1),
          });
          await update(ref(db, `users/${targetUid}`), {
            followersCount: Math.max(0, (rSnap.val() || 0) - 1),
          });
        } else {
          await set(ref(db, `follows/${userId}/${targetUid}`), true);
          await set(ref(db, `followers/${targetUid}/${userId}`), true);
          const fSnap = await get(ref(db, `users/${userId}/followingCount`));
          const rSnap = await get(ref(db, `users/${targetUid}/followersCount`));
          await update(ref(db, `users/${userId}`), {
            followingCount: (fSnap.val() || 0) + 1,
          });
          await update(ref(db, `users/${targetUid}`), {
            followersCount: (rSnap.val() || 0) + 1,
          });
        }
      }
    } catch {
      setSuggestedUsers((prev) =>
        prev.map((item, i) => (i === index ? { ...item, isFollowing: wasFollowing } : item))
      );
      toast.error('حدث خطأ');
    }
  };

  const handleProfileClick = (uid: string) => {
    setViewParams({ userId: uid });
    navigate('profile');
  };

  return (
    <div className="min-h-screen">
      {/* Search Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl p-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ابحث في عدن تويتر"
              className="h-12 rounded-full pr-10 pl-4 bg-muted/50"
              dir="rtl"
            />
          </div>
        </form>
      </div>

      {/* Trending Section */}
      <div className="border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-bold">المواضيع الرائجة</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-4 w-8" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد مواضيع رائجة</p>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate">
              {trending.map((topic, index) => (
                <motion.button
                  key={topic.hashtag}
                  variants={fadeUp}
                  className="w-full flex items-start gap-3 py-2.5 hover:bg-accent/30 px-2 -mx-2 rounded-lg transition-colors text-start"
                  onClick={() => handleTrendClick(topic.hashtag)}
                >
                  <span className="text-muted-foreground text-sm mt-0.5">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{topic.hashtag}</p>
                    <p className="text-muted-foreground text-xs">{topic.category}</p>
                  </div>
                  <span className="text-muted-foreground text-xs mt-0.5">
                    {formatNumber(topic.count)} منشور
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Popular Posts Carousel */}
      <div className="border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold">منشورات شائعة</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-64 shrink-0 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              style={{ scrollbarWidth: 'none' }}
            >
              {popularPosts.slice(0, 6).map((post) => (
                <motion.div
                  key={post.id}
                  whileTap={{ scale: 0.97 }}
                  className="shrink-0 w-64 rounded-2xl border border-border/50 overflow-hidden bg-card cursor-pointer hover:border-border transition-colors"
                  onClick={() => {
                    useAppStore.getState().setSelectedPostId(post.id);
                    navigate('post-detail');
                  }}
                >
                  {post.imageBase64 && (
                    <img
                      src={`data:image/jpeg;base64,${post.imageBase64}`}
                      alt=""
                      className="w-full h-36 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="text-sm line-clamp-3 whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-muted-foreground text-xs">
                      <span>{formatNumber(post.likesCount || 0)} إعجاب</span>
                      <span>{formatNumber(post.repostsCount || 0)} إعادة</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested Users */}
      <div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold">حسابات قد تعجبك</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : suggestedUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد اقتراحات</p>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-1">
              {suggestedUsers.map((item, index) => (
                <motion.div
                  key={item.user.username}
                  variants={fadeUp}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <button
                    className="shrink-0"
                    onClick={() => handleProfileClick(item.user.username)}
                  >
                    {item.user.avatarBase64 ? (
                      <img
                        src={`data:image/jpeg;base64,${item.user.avatarBase64}`}
                        alt={item.user.fullName}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {item.user.fullName?.charAt(0) || 'م'}
                      </div>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm truncate">{item.user.fullName}</span>
                      <VerificationBadge type={item.user.verificationType || 'none'} size="sm" />
                    </div>
                    <p className="text-muted-foreground text-xs truncate">@{item.user.username}</p>
                    {item.user.bio && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{item.user.bio}</p>
                    )}
                  </div>

                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={item.isFollowing ? 'outline' : 'default'}
                      size="sm"
                      className="rounded-full text-xs h-8 px-3 shrink-0"
                      onClick={() => handleFollowUser(item.user, index)}
                    >
                      {item.isFollowing ? (
                        <>
                          <UserMinus className="h-3.5 w-3.5 ml-1" />
                          إلغاء
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 ml-1" />
                          متابعة
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}