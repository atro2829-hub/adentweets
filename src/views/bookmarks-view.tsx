'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { PostCard } from '@/components/tweets/post-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Bookmark, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ref,
  get,
  remove,
  onValue,
  off,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { PostData, UserData } from '@/lib/types';

export function BookmarksView() {
  const { user } = useAuth();
  const userId = user?.uid || null;
  const { goBack } = useAppStore();

  const [bookmarkedPosts, setBookmarkedPosts] = useState<PostData[]>([]);
  const [authorsCache, setAuthorsCache] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  // Real-time listener on bookmarks
  useEffect(() => {
    if (!userId) return;
    const bmRef = ref(db, `bookmarks/${userId}`);
    const unsub = onValue(bmRef, async (snap) => {
      if (!snap.exists()) {
        setBookmarkedPosts([]);
        setBookmarkIds(new Set());
        setLoading(false);
        return;
      }

      const ids = Object.keys(snap.val());
      setBookmarkIds(new Set(ids));

      // Fetch each bookmarked post
      const posts: PostData[] = [];
      const authorIds = new Set<string>();

      await Promise.all(
        ids.map(async (postId) => {
          try {
            const postSnap = await get(ref(db, `posts/${postId}`));
            if (postSnap.exists()) {
              const post = postSnap.val() as PostData;
              if (!post.isDeleted) {
                posts.push(post);
                authorIds.add(post.userId);
              }
            }
          } catch { /* ignore */ }
        })
      );

      posts.sort((a, b) => b.timestamp - a.timestamp);
      setBookmarkedPosts(posts);

      // Fetch authors
      authorIds.forEach(async (uid) => {
        if (authorsCache[uid]) return;
        try {
          const s = await get(ref(db, `users/${uid}`));
          if (s.exists()) {
            setAuthorsCache((prev) => ({ ...prev, [uid]: s.val() as UserData }));
          }
        } catch { /* ignore */ }
      });

      setLoading(false);
    });

    return () => off(bmRef);
  }, [userId, authorsCache]);

  const handleRemoveBookmark = async (postId: string) => {
    if (!userId || !postId) return;

    // Optimistic remove
    setBookmarkedPosts((prev) => prev.filter((p) => p.id !== postId));
    setBookmarkIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });

    try {
      await remove(ref(db, `bookmarks/${userId}/${postId}`));

      // Decrement bookmarksCount
      const snap = await get(ref(db, `posts/${postId}/bookmarksCount`));
      const current = snap.val() || 0;
      await update(ref(db, `posts/${postId}`), { bookmarksCount: Math.max(0, current - 1) });

      toast.success('تمت الإزالة من المحفوظات');
    } catch {
      // Rollback would require re-fetching; toast is sufficient
      toast.error('فشل في إزالة المحفوظ');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">الإشعارات المحفوظة</h1>
          </div>
          {bookmarkedPosts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  className="text-rose-500 focus:text-rose-500"
                  onClick={async () => {
                    if (!userId) return;
                    try {
                      await remove(ref(db, `bookmarks/${userId}`));
                      toast.success('تم مسح جميع المحفوظات');
                    } catch {
                      toast.error('فشل في مسح المحفوظات');
                    }
                  }}
                >
                  مسح الكل
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border/50 px-4 py-3">
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
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && bookmarkedPosts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center px-8"
        >
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bookmark className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold mb-1">لم تحفظ أي تغريدات بعد</h3>
          <p className="text-muted-foreground text-sm">عندما تحفظ تغريدة، ستظهر هنا</p>
        </motion.div>
      )}

      {/* Bookmarked Posts */}
      {!loading && bookmarkedPosts.length > 0 && (
        <AnimatePresence mode="popLayout">
          {bookmarkedPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
              layout
            >
              <div className="relative group">
                <PostCard
                  post={post}
                  author={authorsCache[post.userId] || null}
                />
                {/* Quick remove on swipe area / hover */}
                <button
                  className="absolute top-2 left-2 h-7 w-7 rounded-full bg-rose-500/80 hover:bg-rose-500 items-center justify-center hidden group-hover:flex transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBookmark(post.id);
                  }}
                >
                  <Bookmark className="h-3.5 w-3.5 text-white fill-white" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}