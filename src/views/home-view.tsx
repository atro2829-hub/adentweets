'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import { PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { PostData, UserData } from '@/lib/types';
import {
  ref,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  get,
} from 'firebase/database';
import { db } from '@/lib/firebase';

export function HomeView() {
  const { user, userData } = useAuth();
  const userId = user?.uid;
  const { setComposeOpen } = useAppStore();
  const [posts, setPosts] = useState<(PostData & { author: UserData | null })[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<'الكل' | 'المتابَعين'>('الكل');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loadCount, setLoadCount] = useState(15);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const avatar = userData?.avatarBase64 || '';
  const name = userData?.fullName || 'مستخدم';

  // Fetch following list
  useEffect(() => {
    if (!userId) return;
    const followsRef = ref(db, `follows/${userId}`);
    const unsub = onValue(followsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const ids = new Set(Object.keys(data));
        setFollowingIds(ids);
      } else {
        setFollowingIds(new Set());
      }
    });
    return () => off(followsRef);
  }, [userId]);

  // Fetch posts
  useEffect(() => {
    const postsQuery = query(
      ref(db, 'posts'),
      orderByChild('timestamp'),
      limitToLast(loadCount)
    );

    const unsub = onValue(postsQuery, async (snap) => {
      if (!snap.exists()) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const data = snap.val() as Record<string, PostData>;
      const allPosts: PostData[] = Object.values(data)
        .filter((p) => {
          return !p.isDeleted;
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      setPosts(allPosts.map((p) => ({ ...p, author: null })));
      setIsLoading(false);

      // Fetch authors
      const authorIds = [...new Set(allPosts.map((p: PostData) => p.userId))];
      const newAuthors: Record<string, UserData> = {};
      for (const aid of authorIds) {
        try {
          const aSnap = await get(ref(db, `users/${aid}`));
          if (aSnap.exists()) {
            newAuthors[aid] = aSnap.val();
          }
        } catch {
          // skip
        }
      }
      setAuthors((prev) => ({ ...prev, ...newAuthors }));
    });

    return () => off(postsQuery);
  }, [loadCount]);

  // Attach authors to posts
  const postsWithAuthors = posts.map((p) => ({
    ...p,
    author: authors[p.userId] || null,
  }));

  // Filter based on tab
  const filteredPosts =
    feedTab === 'المتابَعين'
      ? postsWithAuthors.filter((p) => followingIds.has(p.userId))
      : postsWithAuthors;

  // Infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          setLoadCount((prev) => prev + 15);
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading]);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">الرئيسية</h1>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <Tabs
          value={feedTab}
          onValueChange={(v) => setFeedTab(v as 'الكل' | 'المتابَعين')}
          className="w-full"
        >
          <TabsList className="w-full h-12 bg-transparent p-0">
            <TabsTrigger
              value="لك"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              لك
            </TabsTrigger>
            <TabsTrigger
              value="الكل"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الكل
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Compose Area */}
      <div
        className="border-b border-border/50 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setComposeOpen(true)}
      >
        <div className="flex gap-3">
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
          <div className="flex-1 pt-2">
            <p className="text-muted-foreground/60 text-sm">ما الذي يحدث؟</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border/50 px-4 py-3">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <PenSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد تغريدات</h3>
          <p className="text-sm text-muted-foreground">
            {feedTab === 'المتابَعين'
              ? 'تابع أشخاصًا لرؤية تغريداتهم هنا'
              : 'كن أول من ينشر شيئًا اليوم!'}
          </p>
        </div>
      ) : (
        <div>
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                userId: post.userId,
                content: post.content,
                imageBase64: post.imageBase64 || '',
                timestamp: post.timestamp,
                likesCount: post.likesCount || 0,
                commentsCount: post.commentsCount || 0,
                repostsCount: post.repostsCount || 0,
                isDeleted: post.isDeleted || false,
              }}
              author={post.author}
            />
          ))}
          <div ref={loadMoreRef} className="py-4">
            <div className="flex justify-center py-4">
              <span className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}