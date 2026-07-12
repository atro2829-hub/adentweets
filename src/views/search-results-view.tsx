'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { PostCard } from '@/components/tweets/post-card';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Search,
  Users,
  FileText,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  startAt,
  endAt,
  limitToLast,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { PostData, UserData } from '@/lib/types';

type SearchTab = 'people' | 'posts';

export function SearchResultsView() {
  const { user } = useAuth();
  const userId = user?.uid || null;
  const { searchQuery, setSearchQuery, navigate, goBack, setViewParams } = useAppStore();

  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [activeTab, setActiveTab] = useState<SearchTab>('people');
  const [peopleResults, setPeopleResults] = useState<{ user: UserData; uid: string; isFollowing: boolean }[]>([]);
  const [postResults, setPostResults] = useState<PostData[]>([]);
  const [postAuthors, setPostAuthors] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync searchQuery from store
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Perform search with debounce
  const performSearch = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) {
        setPeopleResults([]);
        setPostResults([]);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);

      try {
        // Search people by username (starts with query)
        const usersSnap = await get(ref(db, 'users'));
        const matchedUsers: { user: UserData; uid: string }[] = [];

        if (usersSnap.exists()) {
          const data = usersSnap.val() as Record<string, UserData>;
          const q = queryText.toLowerCase();

          Object.entries(data).forEach(([uid, u]) => {
            if (
              !u.isSuspended &&
              (u.fullName?.toLowerCase().includes(q) ||
                u.username?.toLowerCase().includes(q))
            ) {
              matchedUsers.push({ user: u, uid });
            }
          });
        }

        // Check follow status for each
        const peopleWithFollow = await Promise.all(
          matchedUsers.slice(0, 20).map(async ({ user, uid }) => {
            let isFollowing = false;
            if (userId) {
              const followSnap = await get(ref(db, `follows/${userId}/${uid}`));
              isFollowing = !!followSnap.val();
            }
            return { user, uid, isFollowing };
          })
        );

        setPeopleResults(peopleWithFollow);

        // Search posts by content (client-side)
        const postsSnap = await get(query(ref(db, 'posts'), orderByChild('timestamp'), limitToLast(100)));
        const matchedPosts: PostData[] = [];
        const authorMap: Record<string, UserData> = {};

        if (postsSnap.exists()) {
          const data = postsSnap.val() as Record<string, PostData>;
          const q = queryText.toLowerCase();

          Object.values(data).forEach((p) => {
            if (
              !p.isDeleted &&
              p.content?.toLowerCase().includes(q)
            ) {
              matchedPosts.push(p);
            }
          });
        }

        matchedPosts.sort((a, b) => b.timestamp - a.timestamp);

        // Fetch authors for posts
        const authorIds = [...new Set(matchedPosts.map((p) => p.userId))];
        await Promise.all(
          authorIds.map(async (uid) => {
            try {
              const s = await get(ref(db, `users/${uid}`));
              if (s.exists()) authorMap[uid] = s.val() as UserData;
            } catch { /* ignore */ }
          })
        );

        setPostResults(matchedPosts.slice(0, 30));
        setPostAuthors(authorMap);
      } catch {
        // Silently fail
      }

      setLoading(false);
    },
    [userId]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(inputValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, performSearch]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(inputValue);
  };

  const handleFollow = async (targetUid: string, index: number) => {
    if (!userId) return;
    const wasFollowing = peopleResults[index].isFollowing;

    setPeopleResults((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isFollowing: !wasFollowing } : item))
    );

    try {
      if (wasFollowing) {
        await remove(ref(db, `follows/${userId}/${targetUid}`));
        await remove(ref(db, `followers/${targetUid}/${userId}`));
        const fSnap = await get(ref(db, `users/${userId}/followingCount`));
        const rSnap = await get(ref(db, `users/${targetUid}/followersCount`));
        await update(ref(db, `users/${userId}`), { followingCount: Math.max(0, (fSnap.val() || 0) - 1) });
        await update(ref(db, `users/${targetUid}`), { followersCount: Math.max(0, (rSnap.val() || 0) - 1) });
      } else {
        await set(ref(db, `follows/${userId}/${targetUid}`), true);
        await set(ref(db, `followers/${targetUid}/${userId}`), true);
        const fSnap = await get(ref(db, `users/${userId}/followingCount`));
        const rSnap = await get(ref(db, `users/${targetUid}/followersCount`));
        await update(ref(db, `users/${userId}`), { followingCount: (fSnap.val() || 0) + 1 });
        await update(ref(db, `users/${targetUid}`), { followersCount: (rSnap.val() || 0) + 1 });
      }
    } catch {
      setPeopleResults((prev) =>
        prev.map((item, i) => (i === index ? { ...item, isFollowing: wasFollowing } : item))
      );
      toast.error('حدث خطأ');
    }
  };

  const noResults = hasSearched && !loading && peopleResults.length === 0 && postResults.length === 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2 px-2 py-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="ابحث..."
                className="h-9 rounded-full pr-9 pl-4 bg-muted/50 text-sm"
                dir="rtl"
                autoFocus
              />
            </div>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex relative">
          <button
            onClick={() => setActiveTab('people')}
            className="flex-1 py-3 text-center text-sm font-medium transition-colors"
          >
            <span className={activeTab === 'people' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
              الأشخاص
            </span>
            {activeTab === 'people' && (
              <motion.div
                layoutId="search-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className="flex-1 py-3 text-center text-sm font-medium transition-colors"
          >
            <span className={activeTab === 'posts' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
              التغريدات
            </span>
            {activeTab === 'posts' && (
              <motion.div
                layoutId="search-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {noResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد نتائج</h3>
          <p className="text-muted-foreground text-sm">حاول البحث بكلمات مختلفة</p>
        </motion.div>
      )}

      {/* People Tab */}
      {!loading && activeTab === 'people' && (
        <AnimatePresence>
          {peopleResults.length > 0 ? (
            peopleResults.map((item, index) => (
              <motion.div
                key={item.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
              >
                <button
                  className="shrink-0"
                  onClick={() => {
                    setViewParams({ userId: item.uid });
                    navigate('profile');
                  }}
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
                    onClick={() => handleFollow(item.uid, index)}
                    disabled={item.uid === userId}
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
            ))
          ) : hasSearched ? null : null}
        </AnimatePresence>
      )}

      {/* Posts Tab */}
      {!loading && activeTab === 'posts' && (
        <AnimatePresence>
          {postResults.length > 0
            ? postResults.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <PostCard post={post} author={postAuthors[post.userId] || null} />
                </motion.div>
              ))
            : hasSearched
            ? null
            : null}
        </AnimatePresence>
      )}
    </div>
  );
}