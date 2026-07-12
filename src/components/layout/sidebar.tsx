'use client';

import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import type { AppView, UserData } from '@/lib/types';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  Settings,
  Shield,
  PenSquare,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
}

const navItems: NavItem[] = [
  { view: 'home', label: 'الرئيسية', icon: Home },
  { view: 'explore', label: 'استكشاف', icon: Search },
  { view: 'notifications', label: 'الإشعارات', icon: Bell, badge: true },
  { view: 'messages', label: 'الرسائل', icon: Mail, badge: true },
  { view: 'bookmarks', label: 'المحفوظات', icon: Bookmark },
  { view: 'settings', label: 'الإعدادات', icon: Settings },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

function AvatarCircle({ base64, name, className }: { base64: string; name: string; className?: string }) {
  if (base64) {
    return (
      <img
        src={`data:image/jpeg;base64,${base64}`}
        alt={name}
        className={cn('rounded-full object-cover', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0',
        className
      )}
    >
      {name?.charAt(0) || 'م'}
    </div>
  );
}

function SidebarContent() {
  const {
    currentView,
    navigate,
    setViewParams,
    setComposeOpen,
    isAdminMode,
    setAdminMode,
    unreadCount,
  } = useAppStore();
  const { user, userData, logout } = useAuth();
  const userId = user?.uid;
  const avatar = userData?.avatarBase64 || '';
  const name = userData?.fullName || 'مستخدم';
  const username = userData?.username || 'user';

  const handleNav = (view: AppView) => {
    if (view === 'profile' && userId) {
      setViewParams({ userId });
    }
    navigate(view);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('تم تسجيل الخروج');
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  return (
    <motion.div
      className="flex flex-col h-full py-4 px-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Logo */}
      <motion.button
        className="flex items-center gap-3 px-3 mb-6 hover:opacity-80 transition-opacity"
        onClick={() => navigate('home')}
        variants={itemVariants}
      >
        <img
          src="/at-icon.png"
          alt="AdenTweets"
          className="h-8 w-8 rounded-xl object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="text-xl font-bold hidden xl:block">عدن تويتر</span>
      </motion.button>

      {/* Nav Items */}
      <motion.nav className="flex flex-col gap-1 flex-1" variants={containerVariants}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'bookmarks' && currentView === 'bookmarks');

          return (
            <motion.div key={item.view} variants={itemVariants}>
              <Button
                variant="ghost"
                className={cn(
                  'h-12 w-full justify-start gap-3 px-3 text-base font-normal rounded-full relative transition-colors',
                  isActive
                    ? 'font-bold bg-accent/60'
                    : 'hover:bg-accent/30'
                )}
                onClick={() => handleNav(item.view)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Active indicator bar (right side for RTL) */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="relative">
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.badge && item.view === 'notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full bg-rose-500 text-white font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:block truncate">{item.label}</span>
              </Button>
            </motion.div>
          );
        })}

        {/* Admin Link */}
        {userData?.isAdmin && (
          <motion.div variants={itemVariants}>
            <Button
              variant="ghost"
              className={cn(
                'h-12 w-full justify-start gap-3 px-3 text-base font-normal rounded-full relative transition-colors',
                currentView.startsWith('admin-') ? 'font-bold bg-accent/60' : 'hover:bg-accent/30'
              )}
              onClick={() => {
                setAdminMode(true);
                navigate('admin-dashboard');
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {currentView.startsWith('admin-') && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Shield className="h-5 w-5 shrink-0" />
              <span className="hidden xl:block truncate">لوحة الإدارة</span>
            </Button>
          </motion.div>
        )}

        {/* Compose Button */}
        <motion.div variants={itemVariants} className="mt-4">
          <Button
            className="rounded-full h-12 w-full text-base font-bold"
            onClick={() => setComposeOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PenSquare className="h-5 w-5 xl:ml-2 shrink-0" />
            <span className="hidden xl:block">انشر</span>
          </Button>
        </motion.div>
      </motion.nav>

      {/* User Info + Logout */}
      <motion.div className="mt-auto space-y-1" variants={itemVariants}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-full h-12 px-3 hover:bg-accent/30"
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="hidden xl:block text-muted-foreground">تسجيل الخروج</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-full h-12 px-3 hover:bg-accent/30"
          onClick={() => {
            if (userId) {
              setViewParams({ userId });
              navigate('profile');
            }
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <AvatarCircle base64={avatar} name={name} className="h-10 w-10" />
          <div className="hidden xl:block text-right flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold truncate">{name}</p>
              {userData?.isVerified && (
                <VerificationBadge type={userData.verificationType || 'blue'} size="sm" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">@{username}</p>
          </div>
        </Button>
      </motion.div>
    </motion.div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[72px] xl:w-[275px] h-screen sticky top-0 border-l border-border/50 bg-background/95 backdrop-blur-sm shrink-0 overflow-y-auto">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebarTrigger() {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full lg:hidden"
      onClick={() => setMobileSidebarOpen(true)}
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

function MobileSidebarSheet() {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useAppStore();

  useEffect(() => {
    // Close on route change
    return () => {
      setMobileSidebarOpen(false);
    };
  }, []);

  return (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetContent
        side="right"
        className="w-[300px] p-0 bg-background border-l border-border/50"
      >
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

// Re-export the sheet as a component that renders alongside sidebar
export { MobileSidebarSheet };