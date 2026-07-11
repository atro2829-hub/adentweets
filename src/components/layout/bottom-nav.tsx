'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import type { AppView } from '@/lib/types';
import { Home, Search, Bell, Mail, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ref, onValue, off, query, equalTo, orderByChild } from 'firebase/database';
import { db } from '@/lib/firebase';

const items: { view: AppView; label: string; icon: React.ElementType; badge?: boolean }[] = [
  { view: 'home', label: 'الرئيسية', icon: Home },
  { view: 'explore', label: 'استكشاف', icon: Search },
  { view: 'notifications', label: 'الإشعارات', icon: Bell, badge: true },
  { view: 'messages', label: 'الرسائل', icon: Mail },
  { view: 'profile', label: 'الملف الشخصي', icon: User },
];

export function BottomNav() {
  const { currentView, navigate, setViewParams, unreadCount } = useAppStore();
  const { user } = useAuth();
  const userId = user?.uid;

  const handleClick = (view: AppView) => {
    if (view === 'profile' && userId) {
      setViewParams({ userId });
    }
    navigate(view);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'profile' && currentView === 'edit-profile');

          return (
            <Button
              key={item.view}
              variant="ghost"
              className={cn(
                'relative h-10 w-14 rounded-full flex flex-col items-center justify-center gap-0.5',
                isActive && 'text-primary'
              )}
              onClick={() => handleClick(item.view)}
            >
              <Icon className="h-5 w-5" />
              {item.badge && unreadCount > 0 && (
                <Badge className="absolute -top-0.5 left-0.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full bg-rose-500 text-white border-2 border-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}