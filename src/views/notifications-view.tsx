'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { ref, onValue, off, update, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { UserData, NotificationData } from '@/lib/types';
import { Heart, MessageCircle, Repeat2, UserPlus, AtSign, BellOff } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationWithActor extends NotificationData {
  actorData: UserData | null;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 1) return 'الآن';
  if (diffMin === 1) return 'منذ دقيقة';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour === 1) return 'منذ ساعة';
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay === 1) return 'منذ يوم';
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffWeek === 1) return 'منذ أسبوع';
  if (diffWeek < 5) return `منذ ${diffWeek} أسبوع`;
  if (diffMonth === 1) return 'منذ شهر';
  return `منذ ${diffMonth} شهر`;
}

function getNotificationIcon(type: NotificationData['type']) {
  switch (type) {
    case 'like':
      return <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />;
    case 'comment':
      return <MessageCircle className="h-4 w-4 text-emerald-400" />;
    case 'repost':
      return <Repeat2 className="h-4 w-4 text-emerald-400" />;
    case 'follow':
      return <UserPlus className="h-4 w-4 text-amber-400" />;
    case 'mention':
      return <AtSign className="h-4 w-4 text-amber-400" />;
    default:
      return <BellOff className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActionText(type: NotificationData['type']): string {
  switch (type) {
    case 'like':
      return 'أعجب بمنشورك';
    case 'comment':
      return 'علّق على منشورك';
    case 'follow':
      return 'بدأ بمتابعتك';
    case 'repost':
      return 'أعاد نشر منشورك';
    case 'mention':
      return 'أشار إليك';
    default:
      return 'تفاعل معك';
  }
}

const defaultUserData: UserData = {
  username: '',
  email: '',
  fullName: '',
  bio: '',
  avatarBase64: '',
  bannerBase64: '',
  followersCount: 0,
  followingCount: 0,
  postsCount: 0,
  isVerified: false,
  isPrivate: false,
  isSuspended: false,
  isAdmin: false,
  createdAt: 0,
};

export function NotificationsView() {
  const { user } = useAuth();
  const { navigate, setUnreadCount, setViewParams, currentUserId } = useAppStore();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [actorCache, setActorCache] = useState<Record<string, UserData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const myUid = user?.uid || currentUserId;

  // Listen to notifications in real-time
  useEffect(() => {
    if (!myUid) return;
    setIsLoading(true);

    const notifsRef = ref(db, `notifications/${myUid}`);

    const unsubscribe = onValue(notifsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const data = snapshot.val() as Record<string, Omit<NotificationData, 'id'>>;
      const notifList: NotificationWithActor[] = [];

      for (const [id, notifData] of Object.entries(data)) {
        notifList.push({
          id,
          type: notifData.type,
          actorId: notifData.actorId,
          postId: notifData.postId || '',
          commentId: notifData.commentId || '',
          timestamp: notifData.timestamp || 0,
          isRead: notifData.isRead || false,
          actorData: actorCache[notifData.actorId] || null,
        });
      }

      // Sort by timestamp (newest first)
      notifList.sort((a, b) => b.timestamp - a.timestamp);

      // Count unread
      const unreadCount = notifList.filter((n) => !n.isRead).length;
      setUnreadCount(unreadCount);

      // Fetch actor data for actors we don't have cached
      const actorIds = [...new Set(notifList.map((n) => n.actorId).filter((id) => id && !actorCache[id]))];
      const newCache = { ...actorCache };

      if (actorIds.length > 0) {
        const fetchPromises = actorIds.map(async (actorId) => {
          try {
            const userRef = ref(db, `users/${actorId}`);
            const snap = await get(userRef);
            if (snap.exists()) {
              newCache[actorId] = { ...defaultUserData, ...snap.val() };
            }
          } catch {
            // ignore individual failures
          }
        });
        await Promise.all(fetchPromises);
        setActorCache(newCache);

        // Merge actor data into notifications
        const updatedNotifs = notifList.map((n) => ({
          ...n,
          actorData: newCache[n.actorId] || n.actorData,
        }));
        setNotifications(updatedNotifs);
      } else {
        setNotifications(notifList);
      }

      setIsLoading(false);
    }, (error) => {
      console.error('Firebase notifications listener error:', error);
      toast.error('حدث خطأ في تحميل الإشعارات');
      setIsLoading(false);
    });

    return () => off(notifsRef);
  }, [myUid]);

  // Mark single notification as read
  const handleMarkRead = async (notifId: string) => {
    if (!myUid) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );

    try {
      await update(ref(db, `notifications/${myUid}/${notifId}`), { isRead: true });
      // Update unread count
      const newUnread = notifications.filter((n) => n.id !== notifId && !n.isRead).length;
      setUnreadCount(newUnread);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('حدث خطأ');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (!myUid || isMarkingAll) return;
    setIsMarkingAll(true);

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      const notifsRef = ref(db, `notifications/${myUid}`);
      const snapshot = await get(notifsRef);
      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, unknown>;
        const updates: Record<string, { isRead: boolean }> = {};
        for (const id of Object.keys(data)) {
          updates[id] = { isRead: true };
        }
        await update(notifsRef, updates);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('حدث خطأ في تحديث الإشعارات');
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Handle notification click
  const handleNotifClick = (notif: NotificationWithActor) => {
    // Mark as read
    if (!notif.isRead) {
      handleMarkRead(notif.id);
    }

    // Navigate based on type
    if (notif.type === 'follow') {
      const actorUsername = notif.actorData?.username || '';
      if (actorUsername) {
        setViewParams({ username: actorUsername });
        navigate('profile');
      }
    } else if (notif.postId) {
      useAppStore.getState().setSelectedPostId(notif.postId);
      navigate('post-detail');
    }
  };

  // Handle actor name click
  const handleActorClick = (e: React.MouseEvent, actorId: string) => {
    e.stopPropagation();
    const actor = actorCache[actorId];
    if (actor?.username) {
      setViewParams({ username: actor.username });
      navigate('profile');
    }
  };

  const displayNotifications = notifications;

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">الإشعارات</h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary hover:text-primary/80"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll || notifications.length === 0}
          >
            {isMarkingAll ? (
              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              'قراءة الكل'
            )}
          </Button>
        </div>
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b border-border/50">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : displayNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <BellOff className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد إشعارات</h3>
          <p className="text-sm text-muted-foreground">
            ستظهر الإشعارات هنا عندما يتفاعل الآخرون معك
          </p>
        </div>
      ) : (
        <div>
          {displayNotifications.map((notif) => {
            const actor = notif.actorData;
            const avatarSrc = actor?.avatarBase64
              ? `data:image/jpeg;base64,${actor.avatarBase64}`
              : '';
            const actorName = actor?.fullName || actor?.username || 'مستخدم';
            const initial = actorName.charAt(0);

            return (
              <button
                key={notif.id}
                className={`w-full flex gap-3 px-4 py-3 border-b border-border/50 text-right transition-colors hover:bg-accent/50 ${
                  !notif.isRead ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotifClick(notif)}
              >
                {/* Icon + Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={avatarSrc} alt={actorName} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-background flex items-center justify-center">
                    {getNotificationIcon(notif.type)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed">
                    <span
                      className="font-bold hover:underline cursor-pointer"
                      onClick={(e) => handleActorClick(e, notif.actorId)}
                    >
                      {actorName}
                    </span>{' '}
                    {getActionText(notif.type)}
                  </p>
                  {notif.postId && notif.type !== 'follow' && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {notif.type === 'mention' ? 'أشار إليك في منشور' : 'منشور'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(notif.timestamp)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notif.isRead && (
                  <div className="shrink-0 mt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}