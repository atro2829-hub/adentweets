'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/tweets/post-card';
import { useAuth } from '@/lib/auth-context';
import { Bookmark } from 'lucide-react';
import type { PostData, UserData } from '@/lib/types';
import {
  ref,
  onValue,
  off,
  get,
} from 'firebase/database';
import { db } from '@/lib/firebase';

export function BookmarksView() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [bookmarkedPosts, setBookmarkedPosts] = useState<(PostData & { author: UserData | null })[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const bmRef = ref(db, `bookmarks/${userId}`);
    const unsub = onValue(bmRef, async (snap) => {
      if (!snap.exists()) {
        setBookmarkedPosts([]);
        setIsLoading(false);
        return;
      }

      const bookmarkData = snap.val();
      const postIds = Object.keys(bookmarkData);

      // Fetch each post
      const posts: (PostData & { author: UserData | null })[] = [];
      const authorIds = new Set<string>();

      for (const postId of postIds) {
        try {
          const pSnap = await get(ref(db, `posts/${postId}`));
          if (pSnap.exists()) {
            const postData = pSnap.val() as PostData;
            if (!postData.isDeleted) {
              posts.push({ ...postData, id: postId, author: null });
              authorIds.add(postData.userId);
            }
          }
        } catch {
          // skip
        }
      }

      // Sort by timestamp desc
      posts.sort((a, b) => b.timestamp - a.timestamp);
      setBookmarkedPosts(posts);

      // Fetch authors
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
      setAuthors(newAuthors);
      setIsLoading(false);
    });

    return () => off(bmRef);
  }, [userId]);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">الإشعارات المحفوظة</h1>
        <p className="text-sm text-muted-foreground">@{user?.displayName || ''}</p>
      </div>

      {isLoading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border/50 px-4 py-3">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : bookmarkedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Bookmark className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد محفوظات</h3>
          <p className="text-sm text-muted-foreground">
            احفظ التغريدات لمعاودتها لاحقًا. لا يستطيع أي شخص آخر رؤية محفوظاتك.
          </p>
        </div>
      ) : (
        bookmarkedPosts.map((post) => (
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