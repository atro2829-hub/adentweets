'use client';

import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import type { AppView } from '@/lib/types';
import { Home, Search, Bell, Mail, User, PenSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const items: { view: AppView; label: string; icon: React.ElementType; filled: React.ElementType; badge?: boolean }[] = [
  { view: 'home', label: 'الرئيسية', icon: Home, filled: Home },
  { view: 'explore', label: 'استكشاف', icon: Search, filled: Search },
  { view: 'notifications', label: 'الإشعارات', icon: Bell, filled: Bell, badge: true },
  { view: 'messages', label: 'الرسائل', icon: Mail, filled: Mail },
  { view: 'profile', label: 'الملف الشخصي', icon: User, filled: User },
];

export function BottomNav() {
  const { currentView, navigate, setViewParams, setComposeOpen, unreadCount } = useAppStore();
  const { user } = useAuth();
  const userId = user?.uid;

  const handleClick = (view: AppView) => {
    if (view === 'profile' && userId) {
      setViewParams({ userId });
    }
    navigate(view);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50">
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/40" />

      {/* Safe area padding container */}
      <div className="relative flex items-end justify-around px-2 h-16 pb-[env(safe-area-inset-bottom)]">
        {/* First 3 items */}
        {items.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'profile' && (currentView === 'edit-profile' || currentView === 'profile'));

          return (
            <motion.button
              key={item.view}
              className={cn(
                'relative flex flex-col items-center justify-center h-12 w-14 rounded-2xl transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => handleClick(item.view)}
              whileTap={{ scale: 0.9 }}
            >
              <Icon
                className={cn(
                  'h-6 w-6 transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
                fill={isActive ? 'currentColor' : 'none'}
                strokeWidth={isActive ? 0 : 1.5}
              />
              {/* Unread dot for notifications */}
              {item.badge && item.view === 'notifications' && unreadCount > 0 && (
                <span className="absolute top-1 left-3 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
              )}
            </motion.button>
          );
        })}

        {/* Compose FAB */}
        <motion.button
          className="flex items-center justify-center h-12 w-12 -mt-4 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          onClick={() => setComposeOpen(true)}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
        >
          <PenSquare className="h-5 w-5" />
        </motion.button>

        {/* Last 2 items */}
        {items.slice(3).map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'profile' && (currentView === 'edit-profile' || currentView === 'profile'));

          return (
            <motion.button
              key={item.view}
              className={cn(
                'relative flex flex-col items-center justify-center h-12 w-14 rounded-2xl transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
              onClick={() => handleClick(item.view)}
              whileTap={{ scale: 0.9 }}
            >
              <Icon
                className={cn(
                  'h-6 w-6 transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
                fill={isActive ? 'currentColor' : 'none'}
                strokeWidth={isActive ? 0 : 1.5}
              />
              {/* Unread dot for messages */}
              {item.badge && item.view === 'messages' && (
                <span className="absolute top-1 left-3 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}