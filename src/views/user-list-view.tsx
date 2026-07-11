'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { UserData } from '@/lib/types';
import {
  ref,
  get,
  set,
  remove,
  update,
  onValue,
  off,
} from 'firebase/database';
import { db } from '@/lib/firebase';

interface UserItem {
  uid: string;
  data: UserData;
  isFollowing: boolean;
}

export function UserListView() {
  const { userListType, userListUserId, goBack } = useAppStore();
  const { user } = useAuth();
  const currentUserId = user?.uid;

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!userListUserId) return;
    setIsLoading(true);

    const followsRef = ref(db, `follows/${userListUserId}`);

    const unsub = onValue(followsRef, async (snap) => {
      if (!snap.exists()) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      const data = snap.val();
      const uids = Object.keys(data);

      // For "followers" we need to check who follows this user
      // For "following" we need to get the users this user follows
      // In our schema: follows/{followerId}/{followingId} = timestamp
      // So for userListUserId's following list, the keys are the people they follow
      // For userListUserId's followers, we need to scan all users' follow lists

      let targetUids: string[] = [];

      if (userListType === 'following') {
        // follows/{userListUserId}/{followingId} - keys are people they follow
        targetUids = uids;
      } else {
        // For followers, we need a different approach
        // We'll use follows/{followerId}/{userListUserId} pattern
        // But Firebase doesn't support reverse queries easily
        // We'll store follower relationships in both directions
        // For now, let's check a "followers" node: followers/{userId}/{followerId}
        const followersRef = ref(db, `followers/${userListUserId}`);
        const fSnap = await get(followersRef);
        if (fSnap.exists()) {
          targetUids = Object.keys(fSnap.val());
        }
      }

      // Fetch user data for each uid
      const userItems: UserItem[] = [];
      for (const uid of targetUids) {
        try {
          const uSnap = await get(ref(db, `users/${uid}`));
          if (uSnap.exists()) {
            // Check if current user follows them
            let isFollowing = false;
            if (currentUserId) {
              const fRef = ref(db, `follows/${currentUserId}/${uid}`);
              const fSnap = await get(fRef);
              isFollowing = !!fSnap.val();
            }
            userItems.push({ uid, data: uSnap.val(), isFollowing });
          }
        } catch {
          // skip
        }
      }

      setUsers(userItems);
      setIsLoading(false);
    });

    return () => off(followsRef);
  }, [userListUserId, userListType, currentUserId]);

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
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        await update(ref(db, `users/${currentUserId}`), {
          followingCount: Math.max(0, (fSnap.val() || 0) - 1),
        });
        const fsSnap = await get(ref(db, `users/${targetUid}/followersCount`));
        await update(ref(db, `users/${targetUid}`), {
          followersCount: Math.max(0, (fsSnap.val() || 0) - 1),
        });
      } else {
        await set(followRef, Date.now());
        await set(followerRef, Date.now());
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        await update(ref(db, `users/${currentUserId}`), {
          followingCount: (fSnap.val() || 0) + 1,
        });
        const fsSnap = await get(ref(db, `users/${targetUid}/followersCount`));
        await update(ref(db, `users/${targetUid}`), {
          followersCount: (fsSnap.val() || 0) + 1,
        });
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

  const title = userListType === 'followers' ? 'المتابِعون' : 'يُتابِع';

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
            {userListType === 'followers'
              ? 'لا يوجد متابعين بعد'
              : 'لا يوجد متابَعين بعد'}
          </p>
        </div>
      ) : (
        <div>
          {users.map((u) => (
            <div
              key={u.uid}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors"
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

              {currentUserId !== u.uid && (
                <Button
                  variant={u.isFollowing ? 'outline' : 'default'}
                  size="sm"
                  className="rounded-full h-8 px-4 text-sm shrink-0"
                  disabled={followLoading === u.uid}
                  onClick={() => handleFollow(u.uid)}
                >
                  {followLoading === u.uid
                    ? '...'
                    : u.isFollowing
                      ? 'إلغاء المتابعة'
                      : 'متابعة'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}