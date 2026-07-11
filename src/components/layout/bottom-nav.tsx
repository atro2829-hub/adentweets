'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { Home, Search, Bell, Mail, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function BottomNav() {
  const { currentView, navigate, setCreatePostOpen } = useAppStore();
  const { session } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!session) return;
    const poll = async () => {
      try {
        const [nRes, mRes] = await Promise.all([
          fetch('/api/notifications?unreadOnly=true&limit=1'),
          fetch('/api/messages?limit=1'),
        ]);
        if (nRes.ok) {
          const nData = await nRes.json();
          setUnreadNotifs(nData.totalCount || 0);
        }
        if (mRes.ok) {
          const mData = await mRes.json();
          setUnreadMsgs(mData.unreadCount || 0);
        }
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const items = [
    {
      view: 'home',
      label: 'الرئيسية',
      icon: Home,
      active: currentView === 'home',
    },
    {
      view: 'explore',
      label: 'استكشاف',
      icon: Search,
      active: currentView === 'explore' || currentView === 'search-results',
    },
    {
      view: 'create',
      label: 'انشر',
      icon: Plus,
      active: false,
    },
    {
      view: 'notifications',
      label: 'الإشعارات',
      icon: Bell,
      active: currentView === 'notifications',
      badge: unreadNotifs,
    },
    {
      view: 'messages',
      label: 'الرسائل',
      icon: Mail,
      active: currentView === 'messages' || currentView === 'chat',
      badge: unreadMsgs,
    },
  ];

  const handleClick = (item: (typeof items)[0]) => {
    if (item.view === 'create') {
      setCreatePostOpen(true);
    } else {
      navigate(item.view as never);
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.view}
              variant="ghost"
              className={cn(
                'relative h-10 w-10 rounded-full flex flex-col items-center justify-center gap-0.5',
                item.active && 'text-primary'
              )}
              onClick={() => handleClick(item)}
            >
              {item.view === 'create' ? (
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <Icon className="h-5 w-5" />
                  {item.badge > 0 && (
                    <Badge className="absolute -top-0.5 -left-0.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}