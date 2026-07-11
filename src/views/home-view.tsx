'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard, PostData } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import { ImageIcon, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

export function HomeView() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [feedTab, setFeedTab] = useState('الكل');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          limit: '20',
          ...(feedTab === 'لك' && { following: 'true' }),
          ...(!reset && cursor ? { cursor } : {}),
        });

        const res = await fetch(`/api/posts?${params}`);
        if (!res.ok) throw new Error();

        const data = await res.json();
        const newPosts: PostData[] = data.posts || [];

        if (reset) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
        }

        setCursor(data.nextCursor || null);
        setHasMore(newPosts.length >= 20);
      } catch {
        // Will show empty state
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [cursor, feedTab]
  );

  useEffect(() => {
    setCursor(null);
    fetchPosts(true);
  }, [feedTab, fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchPosts(false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPostContent.trim(),
          imageUrls: newPostImage.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setNewPostContent('');
      setNewPostImage('');
      toast.success('تم نشر التغريدة');
      fetchPosts(true);
    } catch {
      toast.error('فشل في النشر');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">الرئيسية</h1>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <Tabs value={feedTab} onValueChange={setFeedTab} className="w-full">
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

      {/* Create Post Inline */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {session?.user?.name?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="ما الذي يحدث؟"
              className="min-h-[60px] resize-none border-0 bg-transparent text-sm focus-visible:ring-0 p-0 placeholder:text-muted-foreground/60"
              dir="rtl"
            />
            {newPostImage && (
              <div className="relative rounded-xl overflow-hidden border border-border/50 mt-2">
                <img src={newPostImage} alt="صورة" className="w-full max-h-40 object-cover" onError={() => setNewPostImage('')} />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 hover:bg-black/80"
                  onClick={() => setNewPostImage('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-400 hover:text-sky-300 hover:bg-sky-400/10" onClick={() => {
                  const url = prompt('أدخل رابط الصورة:');
                  if (url) setNewPostImage(url);
                }}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                className="rounded-full px-4 font-bold"
                disabled={!newPostContent.trim() || isSubmitting}
                onClick={handleCreatePost}
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    انشر
                  </span>
                )}
              </Button>
            </div>
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
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Sparkles className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد تغريدات</h3>
          <p className="text-sm text-muted-foreground">
            كن أول من ينشر شيئًا اليوم!
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          <div ref={loadMoreRef} className="py-4">
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <span className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}