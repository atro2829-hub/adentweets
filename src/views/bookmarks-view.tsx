'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard, PostData } from '@/components/tweets/post-card';
import { Bookmark } from 'lucide-react';

export function BookmarksView() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/posts/bookmarks?limit=30');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || data.bookmarks || []);
      }
    } catch {
      // empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">المرجعيات</h1>
        <p className="text-sm text-muted-foreground">@{''}</p>
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
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Bookmark className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد مرجعيات</h3>
          <p className="text-sm text-muted-foreground">
            احفظ التغريدات لمعاودتها لاحقًا. لا يستطيع أي شخص آخر رؤية مرجعياتك.
          </p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}