'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PostCard, PostData } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, Search, Users, Image as ImageIcon } from 'lucide-react';

interface SearchUser {
  id: string;
  username: string;
  fullName: string;
  profileImageUrl: string;
  isVerified: boolean;
  isFollowing: boolean;
}

export function SearchResultsView() {
  const { viewParams, goBack } = useAppStore();
  const query = viewParams.query || '';
  const initialTab = viewParams.tab || 'الأحدث';

  const [tab, setTab] = useState(initialTab);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!query) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '30',
        type: tab === 'الأشخاص' ? 'users' : tab === 'الصور' ? 'images' : 'posts',
      });

      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (tab === 'الأشخاص') {
          setUsers(data.users || data.results || []);
        } else if (tab === 'الصور') {
          setPosts(data.posts || data.results || []);
        } else {
          setPosts(data.posts || data.results || []);
        }
      }
    } catch {
      // empty
    } finally {
      setIsLoading(false);
    }
  }, [query, tab]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleFollow = async (userId: string) => {
    setFollowLoading(userId);
    try {
      await fetch('/api/users/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: userId }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u))
      );
    } catch {
      // ignore
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
          <h1 className="text-xl font-bold truncate">{query}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full h-12 bg-transparent p-0">
            <TabsTrigger
              value="الأحدث"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الأحدث
            </TabsTrigger>
            <TabsTrigger
              value="الأشخاص"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الأشخاص
            </TabsTrigger>
            <TabsTrigger
              value="الصور"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الصور
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
              key={u.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors"
            >
              <button
                className="shrink-0"
                onClick={() =>
                  useAppStore.getState().navigate('profile', { userId: u.id })
                }
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.profileImageUrl} alt={u.fullName} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {u.fullName?.charAt(0) || u.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold text-sm truncate hover:underline cursor-pointer"
                  onClick={() =>
                    useAppStore.getState().navigate('profile', { userId: u.id })
                  }
                >
                  {u.fullName}
                </p>
                <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
              </div>
              <Button
                variant={u.isFollowing ? 'outline' : 'default'}
                size="sm"
                className="rounded-full h-8 px-4 text-sm shrink-0"
                disabled={followLoading === u.id}
                onClick={() => handleFollow(u.id)}
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
      ) : tab === 'الصور' ? (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts
            .filter((p) => p.imageUrls)
            .map((post) => {
              const images = post.imageUrls.split(',').filter(Boolean);
              return images.map((img, i) => (
                <div
                  key={`${post.id}-${i}`}
                  className="aspect-square cursor-pointer overflow-hidden"
                  onClick={() =>
                    useAppStore.getState().navigate('post-detail', { postId: post.id })
                  }
                >
                  <img
                    src={img.trim()}
                    alt=""
                    className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                  />
                </div>
              ));
            })}
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}