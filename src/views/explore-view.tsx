'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { Search, TrendingUp, Users } from 'lucide-react';

interface TrendingItem {
  tag: string;
  postsCount: number;
}

interface SuggestedUser {
  id: string;
  username: string;
  fullName: string;
  profileImageUrl: string;
  isVerified: boolean;
  isFollowing: boolean;
}

export function ExploreView() {
  const { navigate } = useAppStore();
  const [query, setQuery] = useState('');
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [tRes, uRes] = await Promise.all([
          fetch('/api/search?type=trending&limit=10'),
          fetch('/api/users/suggested?limit=5'),
        ]);

        if (tRes.ok) {
          const tData = await tRes.json();
          setTrending(tData.hashtags || tData.results || []);
        }
        if (uRes.ok) {
          const uData = await uRes.json();
          setSuggestedUsers(uData.users || uData || []);
        }
      } catch {
        // empty state
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate('search-results', { query: query.trim(), tab: 'الأحدث' });
    }
  };

  const handleHashtagClick = (tag: string) => {
    navigate('search-results', { query: tag, tab: 'الأحدث' });
  };

  const handleFollow = async (userId: string) => {
    setFollowLoading(userId);
    try {
      await fetch('/api/users/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: userId }),
      });
      setSuggestedUsers((prev) =>
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
      {/* Header + Search */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold mb-3">استكشاف</h1>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن أشخاص أو وسوم..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
                    {item.postsCount.toLocaleString('ar')} تغريدة
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
                  key={u.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.profileImageUrl} alt={u.fullName} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {u.fullName?.charAt(0) || u.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p
                        className="font-bold text-sm truncate hover:underline cursor-pointer"
                        onClick={() => navigate('profile', { userId: u.id })}
                      >
                        {u.fullName}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                  </div>
                  <Button
                    variant={u.isFollowing ? 'outline' : 'default'}
                    size="sm"
                    className="rounded-full h-8 px-4 text-sm"
                    disabled={followLoading === u.id}
                    onClick={() => handleFollow(u.id)}
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