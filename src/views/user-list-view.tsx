'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, BadgeCheck } from 'lucide-react';

interface UserListItem {
  id: string;
  username: string;
  fullName: string;
  profileImageUrl: string;
  isVerified: boolean;
  isFollowing: boolean;
}

export function UserListView() {
  const { viewParams, goBack } = useAppStore();
  const userId = viewParams.userId;
  const listType = viewParams.type || 'followers';

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/follows?userId=${userId}&type=${listType}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // empty
    } finally {
      setIsLoading(false);
    }
  }, [userId, listType]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFollow = async (targetUserId: string) => {
    setFollowLoading(targetUserId);
    try {
      await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: targetUserId }),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, isFollowing: !u.isFollowing } : u
        )
      );
    } catch {
      // ignore
    } finally {
      setFollowLoading(null);
    }
  };

  const title = listType === 'followers' ? 'المتابِعون' : 'المتابَعين';

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      {isLoading ? (
        <div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <p className="text-muted-foreground">
            {listType === 'followers'
              ? 'لا يوجد متابعين بعد'
              : 'لا يوجد متابَعين بعد'}
          </p>
        </div>
      ) : (
        <div>
          {users.map((u) => (
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
                <div className="flex items-center gap-1">
                  <button
                    className="font-bold text-sm truncate hover:underline"
                    onClick={() =>
                      useAppStore.getState().navigate('profile', { userId: u.id })
                    }
                  >
                    {u.fullName}
                  </button>
                  {u.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-sky-400 fill-sky-400 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
              </div>

              <Button
                variant={u.isFollowing ? 'outline' : 'default'}
                size="sm"
                className="rounded-full h-8 px-4 text-sm shrink-0"
                disabled={followLoading === u.id}
                onClick={() => handleFollow(u.id)}
              >
                {followLoading === u.id
                  ? '...'
                  : u.isFollowing
                    ? 'إلغاء المتابعة'
                    : 'متابعة'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}