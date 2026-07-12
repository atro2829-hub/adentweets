'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { PostCard } from '@/components/tweets/post-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PenSquare, Feather } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ref,
  get,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { rankPosts, formatRelativeTime } from '@/lib/utils';
import type { PostData, UserData } from '@/lib/types';

const PAGE_SIZE = 20;

function ShimmerPostCard() {
  return (
    <div className="border-b border-border/50 px-4 py-3">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeView() {
  const { user, userData } = useAuth();
  const userId = user?.uid || null;
  const { setComposeOpen, setSelectedPostId, navigate } = useAppStore();

  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [authorsCache, setAuthorsCache] = useState<Record<string, UserData>>({});
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch following IDs
  useEffect(() => {
    if (!userId) return;
    const followsRef = ref(db, `follows/${userId}`);
    const unsub = onValue(followsRef, (snap) => {
      if (snap.exists()) {
        const ids = new Set(Object.keys(snap.val()));
        setFollowingIds(ids);
      } else {
        setFollowingIds(new Set());
      }
    });
    return () => off(followsRef);
  }, [userId]);

  // Fetch all posts (real-time)
  useEffect(() => {
    const postsRef = query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(80));
    const unsub = onValue(postsRef, (snap) => {
      if (!snap.exists()) {
        setPosts([]);
        setLoading(false);
        return;
      }
      const data = snap.val() as Record<string, PostData>;
      const allPosts: PostData[] = Object.values(data)
        .filter((p) => !p.isDeleted)
        .sort((a, b) => b.timestamp - a.timestamp);
      setPosts(allPosts);
      setLoading(false);
      setRefreshing(false);
    });

    return () => off(postsRef);
  }, []);

  // Fetch author data for posts
  useEffect(() => {
    const neededIds = new Set(posts.map((p) => p.userId));
    const cachedIds = new Set(Object.keys(authorsCache));

    const toFetch = [...neededIds].filter((id) => !cachedIds.has(id));
    if (toFetch.length === 0) return;

    toFetch.forEach(async (uid) => {
      if (authorsCache[uid]) return;
      try {
        const snap = await get(ref(db, `users/${uid}`));
        if (snap.exists()) {
          const userData = snap.val() as UserData;
          setAuthorsCache((prev) => ({ ...prev, [uid]: userData }));
        }
      } catch {
        // Silently fail
      }
    });
  }, [posts, authorsCache]);

  // Get displayed posts based on tab
  const displayedPosts = (() => {
    if (activeTab === 'foryou') {
      const interactions: Record<string, number> = {};
      // Compute simple interaction history from following
      followingIds.forEach((id) => {
        interactions[id] = (interactions[id] || 0) + 3;
      });
      const ranked = rankPosts(posts, userId, followingIds, interactions);
      return ranked.slice(0, displayCount);
    } else {
      const followingPosts = posts.filter((p) => followingIds.has(p.userId) || p.userId === userId);
      return followingPosts.slice(0, displayCount);
    }
  })();

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          const nextCount = displayCount + PAGE_SIZE;
          if (nextCount >= displayedPosts.length + PAGE_SIZE) {
            setHasMore(false);
          }
          setDisplayCount(nextCount);
          setLoadingMore(true);
          setTimeout(() => setLoadingMore(false), 300);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayCount, loadingMore, hasMore, displayedPosts.length]);

  // View count tracking via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId && !viewedPosts.has(postId)) {
              setViewedPosts((prev) => {
                const next = new Set(prev);
                next.add(postId);
                return next;
              });
              try {
                const snap = await get(ref(db, `posts/${postId}/viewsCount`));
                const current = snap.val() || 0;
                await update(ref(db, `posts/${postId}`), { viewsCount: current + 1 });
              } catch {
                // Silently fail
              }
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    postRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [displayedPosts, viewedPosts]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setDisplayCount(PAGE_SIZE);
    setHasMore(true);
  }, []);

  // Scroll to top on tab change
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Reset display count via a micro-task to avoid sync setState warning
      requestAnimationFrame(() => {
        setDisplayCount(PAGE_SIZE);
        setHasMore(true);
      });
    }
  }, [activeTab]);

  const avatar = userData?.avatarBase64 || '';
  const name = userData?.fullName || 'مستخدم';

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-bold">الرئيسية</h1>
          <img src="/at-icon.png" alt="AT" className="h-7 w-7 rounded-lg" />
        </div>

        {/* Tabs */}
        <div className="flex relative">
          <button
            onClick={() => setActiveTab('foryou')}
            className="flex-1 py-3 text-center text-sm font-medium transition-colors"
          >
            <span className={activeTab === 'foryou' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
              لك
            </span>
            {activeTab === 'foryou' && (
              <motion.div
                layoutId="home-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className="flex-1 py-3 text-center text-sm font-medium transition-colors"
          >
            <span className={activeTab === 'following' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
              المتابَعين
            </span>
            {activeTab === 'following' && (
              <motion.div
                layoutId="home-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Compose Area */}
      <button
        onClick={() => setComposeOpen(true)}
        className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors text-start w-full"
      >
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
        <span className="text-muted-foreground text-sm">ما الذي يحدث؟</span>
      </button>

      {/* Refreshing indicator */}
      {refreshing && (
        <div className="flex justify-center py-3">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Post List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <ShimmerPostCard key={i} />
            ))}
          </div>
        ) : displayedPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-8 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <PenSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-1">ابدأ المحادثة</h3>
            <p className="text-muted-foreground text-sm">تابع أشخاصًا لرؤية المحتوى</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayedPosts.map((post) => (
              <motion.div
                key={post.id}
                ref={(el) => {
                  if (el) postRefs.current.set(post.id, el);
                }}
                data-post-id={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                transition={{ duration: 0.2 }}
              >
                <PostCard
                  post={post}
                  author={authorsCache[post.userId] || null}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-10" />

        {/* Loading more */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No more posts */}
        {!hasMore && displayedPosts.length > 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Feather className="h-5 w-5 mx-auto mb-1 opacity-50" />
            لا مزيد من المنشورات
          </div>
        )}
      </div>
    </div>
  );
}