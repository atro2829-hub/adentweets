'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Search, Users, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { PostData, UserData } from '@/lib/types';
import {
  ref,
  get,
  set,
  remove,
  update,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  equalTo,
} from 'firebase/database';
import { db } from '@/lib/firebase';

export function SearchResultsView() {
  const { searchQuery, goBack, setViewParams } = useAppStore();
  const [tab, setTab] = useState<'الأشخاص' | 'المنشورات'>('المنشورات');
  const [posts, setPosts] = useState<(PostData & { author: UserData | null })[]>([]);
  const [users, setUsers] = useState<{ uid: string; data: UserData; isFollowing: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Record<string, UserData>>({});
  const { user } = useAuth();
  const currentUserId = user?.uid;

  const fetchResults = useCallback(async () => {
    if (!searchQuery) return;
    setIsLoading(true);

    try {
      if (tab === 'الأشخاص') {
        // Search users by username or fullName
        const usersSnap = await get(ref(db, 'users'));
        if (usersSnap.exists()) {
          const allUsers = usersSnap.val();
          const q = searchQuery.toLowerCase();
          const matched: { uid: string; data: UserData; isFollowing: boolean }[] = [];

          for (const [uid, uData] of Object.entries(allUsers)) {
            const userData = uData as UserData;
            if (
              userData.username?.toLowerCase().includes(q) ||
              userData.fullName?.toLowerCase().includes(q)
            ) {
              let isFollowing = false;
              if (currentUserId) {
                const fSnap = await get(ref(db, `follows/${currentUserId}/${uid}`));
                isFollowing = !!fSnap.val();
              }
              matched.push({ uid, data: userData, isFollowing });
            }
          }
          setUsers(matched);
        }
      } else {
        // Search posts by content
        const postsQuery = query(
          ref(db, 'posts'),
          orderByChild('timestamp'),
          limitToLast(200)
        );
        const snap = await get(postsQuery);
        if (snap.exists()) {
          const data = snap.val();
          const q = searchQuery.toLowerCase();
          const matchedPosts: (PostData & { author: UserData | null })[] = [];

          const postEntries = Object.entries(data).filter(([, p]) => {
            const post = p as PostData;
            return !post.isDeleted && post.content?.toLowerCase().includes(q);
          });

          // Also check if searching for hashtag
          const isHashtag = searchQuery.startsWith('#');

          for (const [id, p] of postEntries) {
            const post = p as PostData;
            if (isHashtag) {
              if (post.content.includes(searchQuery)) {
                matchedPosts.push({ ...post, id, author: null });
              }
            } else {
              matchedPosts.push({ ...post, id, author: null });
            }
          }

          matchedPosts.sort((a, b) => b.timestamp - a.timestamp);
          setPosts(matchedPosts);

          // Fetch authors
          const authorIds = [...new Set(matchedPosts.map((p) => p.userId))];
          const newAuthors: Record<string, UserData> = {};
          for (const aid of authorIds) {
            const aSnap = await get(ref(db, `users/${aid}`));
            if (aSnap.exists()) {
              newAuthors[aid] = aSnap.val();
            }
          }
          setAuthors(newAuthors);
        }
      }
    } catch {
      // empty
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, tab, currentUserId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleFollow = async (targetUid: string) => {
    if (!currentUserId || followLoading) return;
    setFollowLoading(targetUid);
    try {
      const followRef = ref(db, `follows/${currentUserId}/${targetUid}`);
      const followerRef = ref(db, `followers/${targetUid}/${currentUserId}`);
      const existing = await get(followRef);

      if (existing.exists()) {
        await remove(followRef);
        await remove(followerRef);
      } else {
        await set(followRef, Date.now());
        await set(followerRef, Date.now());
      }

      setUsers((prev) =>
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
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{searchQuery}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'الأشخاص' | 'المنشورات')} className="w-full">
          <TabsList className="w-full h-12 bg-transparent p-0">
            <TabsTrigger
              value="المنشورات"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              المنشورات
            </TabsTrigger>
            <TabsTrigger
              value="الأشخاص"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الأشخاص
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading ? (
        <div>
          {tab === 'الأشخاص' ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-b border-border/50 px-4 py-3">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'الأشخاص' ? (
        users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground">لم يتم العثور على أشخاص</p>
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.uid}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors"
            >
              <button
                className="shrink-0"
                onClick={() => {
                  setViewParams({ userId: u.uid });
                  useAppStore.getState().navigate('profile');
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
                  <p
                    className="font-bold text-sm truncate hover:underline cursor-pointer"
                    onClick={() => {
                      setViewParams({ userId: u.uid });
                      useAppStore.getState().navigate('profile');
                    }}
                  >
                    {u.data.fullName}
                  </p>
                  {u.data.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-rose-400 fill-rose-400 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">@{u.data.username}</p>
              </div>
              <Button
                variant={u.isFollowing ? 'outline' : 'default'}
                size="sm"
                className="rounded-full h-8 px-4 text-sm shrink-0"
                disabled={followLoading === u.uid}
                onClick={() => handleFollow(u.uid)}
              >
                {u.isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
              </Button>
            </div>
          ))
        )
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground">لم يتم العثور على نتائج</p>
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