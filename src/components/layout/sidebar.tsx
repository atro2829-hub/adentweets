'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/store/app-store';
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  Settings,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { view: 'home' as const, label: 'الرئيسية', icon: Home },
  { view: 'explore' as const, label: 'استكشاف', icon: Search },
  { view: 'notifications' as const, label: 'الإشعارات', icon: Bell },
  { view: 'messages' as const, label: 'الرسائل', icon: Mail },
  { view: 'bookmarks' as const, label: 'المرجعيات', icon: Bookmark },
  { view: 'profile' as const, label: 'الملف الشخصي', icon: User },
  { view: 'settings' as const, label: 'الإعدادات', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentView, navigate, setCreatePostOpen } = useAppStore();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const handleNav = (view: string) => {
    if (view === 'profile' && userId) {
      navigate('profile', { username: session?.user?.username || '' });
    } else {
      navigate(view as never);
    }
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full py-4 px-2">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold hidden lg:block">عدن تويتر</span>
      </div>

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
              <Icon className="h-6 w-6" />
              <span className="hidden lg:block">{item.label}</span>
            </Button>
          );
        })}

        {/* Create Post Button */}
        <Button
          className="mt-4 rounded-full h-12 w-full text-base font-bold"
          onClick={() => setCreatePostOpen(true)}
        >
          <Plus className="h-6 w-6 lg:ml-2" />
          <span className="hidden lg:block">انشر</span>
        </Button>
      </nav>

      {/* User info */}
      <div className="mt-auto p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-full h-12 px-3"
          onClick={() => userId && navigate('profile', { username: session?.user?.username || '' })}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {session?.user?.name?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:block text-right flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{session?.user?.name || 'مستخدم'}</p>
            <p className="text-sm text-muted-foreground truncate">
              @{session?.user?.username || 'user'}
            </p>
          </div>
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 h-screen sticky top-0 border-l border-border/50 bg-background/95 backdrop-blur-sm shrink-0">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-3 right-3 z-40 h-10 w-10"
        >
          <Sparkles className="h-6 w-6 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0">
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}