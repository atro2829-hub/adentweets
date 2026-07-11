'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import type { AppView } from '@/lib/types';
import {
  Home,
  Search,
  Bell,
  Mail,
  User,
  Bookmark,
  Settings,
  LogOut,
  Shield,
  PenSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'home', label: 'الرئيسية', icon: Home },
  { view: 'explore', label: 'استكشاف', icon: Search },
  { view: 'notifications', label: 'الإشعارات', icon: Bell },
  { view: 'messages', label: 'الرسائل', icon: Mail },
  { view: 'profile', label: 'الملف الشخصي', icon: User },
  { view: 'bookmarks', label: 'الإشعارات المحفوظة', icon: Bookmark },
  { view: 'settings', label: 'الإعدادات', icon: Settings },
];

function SidebarContent() {
  const { currentView, navigate, setViewParams, setComposeOpen, isAdminMode, setAdminMode } =
    useAppStore();
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
    <div className="flex flex-col h-full py-4 px-3">
      {/* Logo */}
      <button
        className="flex items-center gap-2 px-3 mb-6 hover:opacity-80 transition-opacity"
        onClick={() => navigate('home')}
      >
        <img
          src="/at-icon.png"
          alt="AdenTweets"
          className="h-10 w-10 rounded-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="text-xl font-bold hidden lg:block">عدن تويتر</span>
      </button>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'profile' && currentView === 'edit-profile');

          return (
            <Button
              key={item.view}
              variant="ghost"
              className={cn(
                'h-12 w-full justify-start gap-3 px-3 text-base font-normal rounded-full',
                isActive && 'font-bold'
              )}
              onClick={() => handleNav(item.view)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block truncate">{item.label}</span>
            </Button>
          );
        })}

        {/* Admin Link */}
        {userData?.isAdmin && (
          <Button
            variant="ghost"
            className={cn(
              'h-12 w-full justify-start gap-3 px-3 text-base font-normal rounded-full',
              currentView === 'admin-dashboard' && 'font-bold'
            )}
            onClick={() => {
              setAdminMode(true);
              navigate('admin-dashboard');
            }}
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block truncate">لوحة الإدارة</span>
          </Button>
        )}

        {/* Compose Button */}
        <Button
          className="mt-4 rounded-full h-12 w-full text-base font-bold"
          onClick={() => setComposeOpen(true)}
        >
          <PenSquare className="h-5 w-5 lg:ml-2 shrink-0" />
          <span className="hidden lg:block">انشر</span>
        </Button>
      </nav>

      {/* User Info + Logout */}
      <div className="mt-auto space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-full h-12 px-3"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden lg:block">تسجيل الخروج</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-full h-12 px-3"
          onClick={() => {
            if (userId) {
              setViewParams({ userId });
              navigate('profile');
            }
          }}
        >
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
            {avatar ? (
              <img
                src={`data:image/jpeg;base64,${avatar}`}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-primary text-sm font-bold">{name.charAt(0)}</span>
            )}
          </div>
          <div className="hidden lg:block text-right flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">@{username}</p>
          </div>
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-20 xl:w-64 h-screen sticky top-0 border-l border-border/50 bg-background/95 backdrop-blur-sm shrink-0 overflow-y-auto">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  return null;
}