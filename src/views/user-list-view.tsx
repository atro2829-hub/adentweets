'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Search, UserPlus, UserMinus, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { UserData } from '@/lib/types';

const PAGE_SIZE = 20;

export function UserListView() {
  const { user } = useAuth();
  const currentUserId = user?.uid || null;
  const { userListType, userListUserId, goBack, navigate, setViewParams } = useAppStore();

  const [users, setUsers] = useState<{ user: UserData; uid: string; isFollowing: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const titleMap: Record<string, string> = {
    followers: 'المتابِعون',
    following: 'يُتابِع',
    likes: 'المعجبون',
    reposts: 'المُعيدون',
  };

  const title = titleMap[userListType || ''] || 'المستخدمون';

  // Fetch user list
  useEffect(() => {
    if (!userListUserId || !userListType) return;
    requestAnimationFrame(() => setLoading(true));

    let listRef;
    if (userListType === 'following') {
      listRef = ref(db, `follows/${userListUserId}`);
    } else if (userListType === 'followers') {
      listRef = ref(db, `followers/${userListUserId}`);
    } else if (userListType === 'likes') {
      listRef = ref(db, `userLikes/${userListUserId}`);
    } else {
      listRef = ref(db, `reposts/${userListUserId}`);
    }

    const unsub = onValue(listRef, async (snap) => {
      if (!snap.exists()) {
        setUsers([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const ids = Object.keys(snap.val());
      setTotal(ids.length);

      // Fetch user data for each ID
      const results: { user: UserData; uid: string; isFollowing: boolean }[] = [];

      await Promise.all(
        ids.slice(0, 50).map(async (uid) => {
          try {
            const userSnap = await get(ref(db, `users/${uid}`));
            if (!userSnap.exists()) return;

            const userData = userSnap.val() as UserData;
            if (userData.isSuspended) return;

            let isFollowing = false;
            if (currentUserId && currentUserId !== uid) {
              const followSnap = await get(ref(db, `follows/${currentUserId}/${uid}`));
              isFollowing = !!followSnap.val();
            }

            results.push({ user: userData, uid, isFollowing });
          } catch { /* ignore */ }
        })
      );

      setUsers(results);
      setLoading(false);
    });

    return () => off(listRef);
  }, [userListUserId, userListType, currentUserId]);

  // Filter
  const filteredUsers = useMemo(() => {
    if (!filterText.trim()) return users;
    const q = filterText.toLowerCase();
    return users.filter(
      (item) =>
        item.user.fullName?.toLowerCase().includes(q) ||
        item.user.username?.toLowerCase().includes(q)
    );
  }, [users, filterText]);

  const displayedUsers = filteredUsers.slice(0, displayCount);

  const handleFollow = async (targetUid: string, index: number) => {
    if (!currentUserId) return;
    const wasFollowing = displayedUsers[index].isFollowing;

    setUsers((prev) =>
      prev.map((item) =>
        item.uid === targetUid ? { ...item, isFollowing: !wasFollowing } : item
      )
    );

    try {
      if (wasFollowing) {
        await remove(ref(db, `follows/${currentUserId}/${targetUid}`));
        await remove(ref(db, `followers/${targetUid}/${currentUserId}`));
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        const rSnap = await get(ref(db, `users/${targetUid}/followersCount`));
        await update(ref(db, `users/${currentUserId}`), { followingCount: Math.max(0, (fSnap.val() || 0) - 1) });
        await update(ref(db, `users/${targetUid}`), { followersCount: Math.max(0, (rSnap.val() || 0) - 1) });
      } else {
        await set(ref(db, `follows/${currentUserId}/${targetUid}`), true);
        await set(ref(db, `followers/${targetUid}/${currentUserId}`), true);
        const fSnap = await get(ref(db, `users/${currentUserId}/followingCount`));
        const rSnap = await get(ref(db, `users/${targetUid}/followersCount`));
        await update(ref(db, `users/${currentUserId}`), { followingCount: (fSnap.val() || 0) + 1 });
        await update(ref(db, `users/${targetUid}`), { followersCount: (rSnap.val() || 0) + 1 });
      }
    } catch {
      setUsers((prev) =>
        prev.map((item) =>
          item.uid === targetUid ? { ...item, isFollowing: wasFollowing } : item
        )
      );
      toast.error('حدث خطأ');
    }
  };

  const handleUserClick = (uid: string) => {
    setViewParams({ userId: uid });
    navigate('profile');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2 px-2 py-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{title}</h1>
            {total > 0 && (
              <p className="text-muted-foreground text-xs">{total} حساب</p>
            )}
          </div>
        </div>

        {/* Search filter */}
        {users.length > 5 && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="تصفية"
                className="h-9 rounded-full pr-9 pl-4 bg-muted/50 text-sm"
                dir="rtl"
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-11 w-11 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* User List */}
      {!loading && (
        <AnimatePresence>
          {displayedUsers.length > 0 ? (
            displayedUsers.map((item, index) => (
              <motion.div
                key={item.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => handleUserClick(item.uid)}
              >
                {/* Avatar */}
                <div className="shrink-0">
                  {item.user.avatarBase64 ? (
                    <img
                      src={`data:image/jpeg;base64,${item.user.avatarBase64}`}
                      alt={item.user.fullName}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {item.user.fullName?.charAt(0) || 'م'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm truncate">{item.user.fullName}</span>
                    <VerificationBadge type={item.user.verificationType || 'none'} size="sm" />
                  </div>
                  <p className="text-muted-foreground text-xs truncate">@{item.user.username}</p>
                  {item.user.bio && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{item.user.bio}</p>
                  )}
                </div>

                {/* Follow Button */}
                {currentUserId !== item.uid && (
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={item.isFollowing ? 'outline' : 'default'}
                      size="sm"
                      className="rounded-full text-xs h-8 px-3 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollow(item.uid, index);
                      }}
                    >
                      {item.isFollowing ? (
                        <>
                          <UserMinus className="h-3.5 w-3.5 ml-1" />
                          إلغاء
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 ml-1" />
                          متابعة
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold mb-1">
                {filterText ? 'لا توجد نتائج' : 'لا يوجد أحد هنا بعد'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {filterText ? 'حاول بكلمات مختلفة' : 'سيظهر المستخدمون هنا عندما يتابعون أو يُتابَعون'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Load more */}
      {displayCount < filteredUsers.length && (
        <div className="text-center py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
          >
            عرض المزيد
          </Button>
        </div>
      )}
    </div>
  );
}