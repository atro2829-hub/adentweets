'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  UserPlus,
  Repeat2,
  Quote,
  BadgeCheck,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off, get, set, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { NotificationData, UserData, PostData } from '@/lib/types';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { PostCard } from '@/components/tweets/post-card';
import { toast } from 'sonner';

interface NotificationWithActor extends NotificationData {
  actorUser?: UserData | null;
  relatedPost?: PostData | null;
}

type NotifType = NotificationData['type'];

const typeConfig: Record<NotifType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  like: { label: 'أعجب بمنشورك', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  comment: { label: 'علّق على منشورك', icon: MessageCircle, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  follow: { label: 'بدأ بمتابعتك', icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  repost: { label: 'أعاد نشر تغريدتك', icon: Repeat2, color: 'text-green-400', bg: 'bg-green-400/10' },
  quote: { label: 'اقتبس تغريدتك', icon: Quote, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  verification: { label: 'تم التحقق من حسابك', icon: BadgeCheck, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  mention: { label: 'أشار إليك', icon: MessageCircle, color: 'text-sky-400', bg: 'bg-sky-400/10' },
};

function groupByTime(notifs: NotificationWithActor[]) {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const weekAgo = todayMs - 7 * 24 * 60 * 60 * 1000;

  const todayList: NotificationWithActor[] = [];
  const weekList: NotificationWithActor[] = [];
  const olderList: NotificationWithActor[] = [];

  for (const n of notifs) {
    if (n.timestamp >= todayMs) todayList.push(n);
    else if (n.timestamp >= weekAgo) weekList.push(n);
    else olderList.push(n);
  }

  const groups: { label: string; items: NotificationWithActor[] }[] = [];
  if (todayList.length) groups.push({ label: 'اليوم', items: todayList });
  if (weekList.length) groups.push({ label: 'هذا الأسبوع', items: weekList });
  if (olderList.length) groups.push({ label: 'الأسبوع الماضي', items: olderList });
  return groups;
}

export function NotificationsView() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { navigate, setSelectedPostId, setViewParams, setUnreadCount } = useAppStore();

  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, UserData>>({});
  const [postCache, setPostCache] = useState<Record<string, PostData>>({});

  const fetchUser = useCallback(async (userId: string): Promise<UserData | null> => {
    if (userCache[userId]) return userCache[userId];
    try {
      const snap = await get(ref(db, `users/${userId}`));
      if (snap.exists()) {
        const data = snap.val() as UserData;
        setUserCache((prev) => ({ ...prev, [userId]: data }));
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, [userCache]);

  const fetchPost = useCallback(async (postId: string): Promise<PostData | null> => {
    if (postCache[postId]) return postCache[postId];
    try {
      const snap = await get(ref(db, `posts/${postId}`));
      if (snap.exists()) {
        const data = snap.val() as PostData;
        setPostCache((prev) => ({ ...prev, [postId]: data }));
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, [postCache]);

  // Listen to notifications
  useEffect(() => {
    if (!uid) return;
    const notifRef = ref(db, `notifications/${uid}`);
    const unsub = onValue(notifRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const raw = snapshot.val();
      const list: NotificationWithActor[] = [];

      for (const [id, val] of Object.entries(raw)) {
        const n = val as NotificationData;
        const actor = await fetchUser(n.actorId);
        let relatedPost: PostData | null = null;
        if (n.postId) relatedPost = await fetchPost(n.postId);
        list.push({ ...n, id, actorUser: actor, relatedPost });
      }

      list.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(list);

      const unread = list.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
      setLoading(false);
    });
    return () => off(notifRef);
  }, [uid, fetchUser, fetchPost, setUnreadCount]);

  // Mark individual as read
  const markAsRead = useCallback(async (notif: NotificationWithActor) => {
    if (!uid || notif.isRead) return;
    try {
      await update(ref(db, `notifications/${uid}/${notif.id}`), { isRead: true });
    } catch { /* ignore */ }
  }, [uid]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!uid) return;
    try {
      const updates: Record<string, boolean> = {};
      for (const n of notifications) {
        if (!n.isRead) {
          updates[`notifications/${uid}/${n.id}/isRead`] = true;
        }
      }
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
        toast.success('تم قراءة جميع الإشعارات');
      }
    } catch {
      toast.error('حدث خطأ');
    }
  }, [uid, notifications]);

  // Handle click
  const handleClick = useCallback(async (notif: NotificationWithActor) => {
    await markAsRead(notif);
    if (notif.type === 'follow' && notif.actorId) {
      setViewParams({ userId: notif.actorId });
      navigate('profile');
    } else if (notif.postId) {
      setSelectedPostId(notif.postId);
      navigate('post-detail');
    } else if (notif.actorId) {
      setViewParams({ userId: notif.actorId });
      navigate('profile');
    }
  }, [markAsRead, navigate, setSelectedPostId, setViewParams]);

  // Follow back handler
  const handleFollowBack = useCallback(async (e: React.MouseEvent, actorId: string) => {
    e.stopPropagation();
    if (!uid) return;
    try {
      await set(ref(db, `follows/${uid}/${actorId}`), Date.now());
      await set(ref(db, `followers/${actorId}/${uid}`), true);
      toast.success('تمت المتابعة');
    } catch {
      toast.error('حدث خطأ');
    }
  }, [uid]);

  const grouped = useMemo(() => groupByTime(notifications), [notifications]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">الإشعارات</h1>
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs gap-1.5">
            <CheckCheck className="h-4 w-4" />
            قراءة الكل
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bell className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">لا توجد إشعارات</p>
          <p className="text-sm mt-1">ستظهر هنا الإشعارات الجديدة</p>
        </div>
      ) : (
        <div>
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-2 text-sm font-bold text-muted-foreground bg-muted/30">
                {group.label}
              </div>
              {group.items.map((notif, index) => {
                const config = typeConfig[notif.type] || typeConfig.like;
                const Icon = config.icon;
                const actor = notif.actorUser;

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleClick(notif)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border/30',
                      !notif.isRead && 'border-r-2 border-r-sky-500 bg-sky-500/5'
                    )}
                  >
                    {/* Actor Avatar */}
                    <div className="relative shrink-0">
                      {actor?.avatarBase64 ? (
                        <img
                          src={`data:image/jpeg;base64,${actor.avatarBase64}`}
                          alt={actor.fullName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {actor?.fullName?.charAt(0) || 'م'}
                        </div>
                      )}
                      <span className={cn('absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-full flex items-center justify-center', config.bg)}>
                        <Icon className={cn('h-3 w-3', config.color)} />
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm">
                          <span className={cn('font-bold', !notif.isRead && 'text-foreground')}>
                            {actor?.fullName || 'مستخدم'}
                          </span>
                          <VerificationBadge type={actor?.verificationType} size="sm" />
                          <span className="text-muted-foreground"> {config.label}</span>
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>

                      {/* Follow back button */}
                      {notif.type === 'follow' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1.5 h-7 text-xs rounded-full px-3"
                          onClick={(e) => actor && handleFollowBack(e, notif.actorId)}
                        >
                          متابعة
                        </Button>
                      )}

                      {/* Related post preview */}
                      {notif.relatedPost && !notif.relatedPost.isDeleted && (
                        <div className="mt-2 p-2 rounded-xl bg-card border border-border/50 max-w-sm">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notif.relatedPost.content.length > 100
                              ? notif.relatedPost.content.slice(0, 100) + '...'
                              : notif.relatedPost.content}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shrink-0 mt-2" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}