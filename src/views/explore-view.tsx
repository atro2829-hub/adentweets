'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { Search, TrendingUp, Users, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { PostData, UserData } from '@/lib/types';
import {
  ref,
  get,
  set,
  remove,
  update,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import { db } from '@/lib/firebase';

interface SuggestedUser {
  uid: string;
  data: UserData;
  isFollowing: boolean;
}

export function ExploreView() {
  const { navigate, setSearchQuery } = useAppStore();
  const { user } = useAuth();
  const userId = user?.uid;
  const [queryText, setQueryText] = useState('');
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch recent posts to extract hashtags
        const postsQuery = query(
          ref(db, 'posts'),
          orderByChild('timestamp'),
          limitToLast(100)
        );
        const snap = await get(postsQuery);

        const hashtagCounts: Record<string, number> = {};
        const allUserIds = new Set<string>();

        if (snap.exists()) {
          const data = snap.val();
          Object.values(data).forEach((p: unknown) => {
            const post = p as PostData;
            if (post.isDeleted) return;
            allUserIds.add(post.userId);
            // Extract hashtags
            const tags = post.content.match(/#\S+/g) || [];
            tags.forEach((tag) => {
              hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });
          });
        }

        // Sort by count and take top 10
        const sortedTags = Object.entries(hashtagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }));

        setTrending(sortedTags);

        // Suggested users: get some users not followed by current user
        if (userId) {
          const followingSnap = await get(ref(db, `follows/${userId}`));
          const followingIds = followingSnap.exists()
            ? new Set(Object.keys(followingSnap.val()))
            : new Set<string>();

          const usersSnap = await get(ref(db, 'users'));
          if (usersSnap.exists()) {
            const usersData = usersSnap.val();
            const suggested: SuggestedUser[] = [];

            for (const [uid, uData] of Object.entries(usersData)) {
              if (uid === userId) continue;
              if (followingIds.has(uid)) continue;
              const userData = uData as UserData;
              if (suggested.length < 5) {
                suggested.push({
                  uid,
                  data: userData,
                  isFollowing: false,
                });
              }
            }

            setSuggestedUsers(suggested);
          }
        }
      } catch {
        // empty state
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryText.trim()) {
      setSearchQuery(queryText.trim());
      navigate('search-results');
    }
  };

  const handleHashtagClick = (tag: string) => {
    setSearchQuery(tag);
    navigate('search-results');
  };

  const handleFollow = async (targetUid: string) => {
    if (!userId || followLoading) return;
    setFollowLoading(targetUid);
    try {
      const followRef = ref(db, `follows/${userId}/${targetUid}`);
      const followerRef = ref(db, `followers/${targetUid}/${userId}`);
      const existing = await get(followRef);

      if (existing.exists()) {
        await remove(followRef);
        await remove(followerRef);
        const fSnap = await get(ref(db, `users/${userId}/followingCount`));
        await update(ref(db, `users/${userId}`), {
          followingCount: Math.max(0, (fSnap.val() || 0) - 1),
        });
      } else {
        await set(followRef, Date.now());
        await set(followerRef, Date.now());
        const fSnap = await get(ref(db, `users/${userId}/followingCount`));
        await update(ref(db, `users/${userId}`), {
          followingCount: (fSnap.val() || 0) + 1,
        });
      }

      setSuggestedUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid ? { ...u, isFollowing: !u.isFollowing } : u
        )
      );
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div>
      {/* Header + Search */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold mb-3">استكشاف</h1>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن أشخاص أو وسوم..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            className="pr-10 rounded-full h-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </form>
      </div>

      <div className="divide-y divide-border/50">
        {/* Trending */}
        <section className="px-4 py-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            الأكثر رواجًا
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              لا توجد وسوم رائجة حاليًا
            </p>
          ) : (
            <div className="space-y-1">
              {trending.map((item, i) => (
                <button
                  key={i}
                  className="w-full text-right py-2.5 px-2 rounded-xl hover:bg-accent/50 transition-colors"
                  onClick={() => handleHashtagClick(item.tag)}
                >
                  <p className="text-xs text-muted-foreground">ترند في اليمن</p>
                  <p className="font-bold text-sm mt-0.5">{item.tag}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.count.toLocaleString('ar')} تغريدة
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Suggested Users */}
        <section className="px-4 py-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            مقترحون لك
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : suggestedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              لا توجد مقترحات حاليًا
            </p>
          ) : (
            <div className="space-y-1">
              {suggestedUsers.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <button
                    className="shrink-0"
                    onClick={() => {
                      const store = useAppStore.getState();
                      store.setViewParams({ userId: u.uid });
                      store.navigate('profile');
                    }}
                  >
                    {u.data.avatarBase64 ? (
                      <img
                        src={`data:image/jpeg;base64,${u.data.avatarBase64}`}
                        alt={u.data.fullName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                        {u.data.fullName?.charAt(0) || 'م'}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <button
                        className="font-bold text-sm truncate hover:underline"
                        onClick={() => {
                          const store = useAppStore.getState();
                          store.setViewParams({ userId: u.uid });
                          store.navigate('profile');
                        }}
                      >
                        {u.data.fullName}
                      </button>
                      {u.data.isVerified && (
                        <BadgeCheck className="h-4 w-4 text-rose-400 fill-rose-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">@{u.data.username}</p>
                  </div>
                  <Button
                    variant={u.isFollowing ? 'outline' : 'default'}
                    size="sm"
                    className="rounded-full h-8 px-4 text-sm"
                    disabled={followLoading === u.uid}
                    onClick={() => handleFollow(u.uid)}
                  >
                    {u.isFollowing ? 'متابَع' : 'متابعة'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}