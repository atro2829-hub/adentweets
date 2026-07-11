'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { Heart, MessageCircle, Repeat2, UserPlus, Check } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    fullName: string;
    profileImageUrl: string;
  };
  post?: {
    id: string;
    content: string;
  };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return `منذ ${Math.floor(diffDay / 7)} أسبوع`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'like':
      return <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />;
    case 'comment':
      return <MessageCircle className="h-4 w-4 text-sky-400" />;
    case 'retweet':
      return <Repeat2 className="h-4 w-4 text-emerald-400" />;
    case 'follow':
      return <UserPlus className="h-4 w-4 text-sky-400" />;
    default:
      return <Check className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActionText(type: string) {
  switch (type) {
    case 'like':
      return 'أعجب بمنشورك';
    case 'comment':
      return 'علّق على منشورك';
    case 'retweet':
      return 'أعاد نشر تغريدتك';
    case 'follow':
      return 'بدأ بمتابعتك';
    default:
      return 'تفاعل معك';
  }
}

export function NotificationsView() {
  const { navigate } = useAppStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('الكل');
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '30',
        ...(tab === 'الإشعارات غير المقروءة' ? { unreadOnly: 'true' } : {}),
      });
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || data || []);
      }
    } catch {
      // empty
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notifId }),
      });
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">الإشعارات</h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
          >
            تحديد الكل كمقروء
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full h-12 bg-transparent p-0">
            <TabsTrigger
              value="الكل"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              الكل
            </TabsTrigger>
            <TabsTrigger
              value="الإشعارات غير المقروءة"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              غير المقروءة
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Check className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد إشعارات</h3>
          <p className="text-sm text-muted-foreground">ستظهر الإشعارات هنا عندما يتفاعل الآخرون معك</p>
        </div>
      ) : (
        <div>
          {notifications.map((notif) => (
            <button
              key={notif.id}
              className={`w-full flex gap-3 px-4 py-3 border-b border-border/50 text-right transition-colors hover:bg-accent/50 ${
                !notif.isRead ? 'bg-primary/5' : ''
              }`}
              onClick={() => {
                handleMarkRead(notif.id);
                if (notif.post) {
                  navigate('post-detail', { postId: notif.post.id });
                } else if (notif.type === 'follow') {
                  navigate('profile', { userId: notif.actor.id });
                }
              }}
            >
              {/* Icon */}
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={notif.actor.profileImageUrl} alt={notif.actor.fullName} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {notif.actor.fullName?.charAt(0) || notif.actor.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-background flex items-center justify-center">
                  {getNotificationIcon(notif.type)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span
                    className="font-bold hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('profile', { userId: notif.actor.id });
                    }}
                  >
                    {notif.actor.fullName}
                  </span>{' '}
                  {getActionText(notif.type)}
                </p>
                {notif.post && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {notif.post.content}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(notif.createdAt)}
                </p>
              </div>

              {!notif.isRead && (
                <div className="shrink-0 mt-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}