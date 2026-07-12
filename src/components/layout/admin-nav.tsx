'use client';

import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import type { AppView } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'admin-dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { view: 'admin-users', label: 'المستخدمين', icon: Users },
  { view: 'admin-posts', label: 'المنشورات', icon: FileText },
  { view: 'admin-comments', label: 'التعليقات', icon: MessageSquare },
  { view: 'admin-reports', label: 'البلاغات', icon: AlertTriangle },
  { view: 'admin-analytics', label: 'الإحصائيات', icon: BarChart3 },
];

interface AdminNavProps {
  activeView?: AppView;
}

export function AdminNav({ activeView }: AdminNavProps) {
  const { navigate, setAdminMode } = useAppStore();

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-4 py-2 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0',
                isActive
                  ? 'bg-accent font-bold text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={() => {
            setAdminMode(false);
            navigate('home');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap text-rose-400 hover:bg-rose-400/10 transition-colors shrink-0 mr-auto"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للتطبيق
        </button>
      </div>
    </div>
  );
}