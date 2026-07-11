'use client';

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, off, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  LogOut,
  Menu,
  LayoutDashboard,
  UserCog,
  MessageSquare,
  Flag,
  BarChart3,
  ArrowRight,
  Shield,
} from 'lucide-react';
import type { UserData, PostData } from '@/lib/types';

const adminNavItems = [
  { view: 'admin-dashboard' as const, label: 'لوحة التحكم', icon: LayoutDashboard },
  { view: 'admin-users' as const, label: 'المستخدمين', icon: UserCog },
  { view: 'admin-posts' as const, label: 'المنشورات', icon: MessageSquare },
  { view: 'admin-comments' as const, label: 'التعليقات', icon: MessageSquare },
  { view: 'admin-reports' as const, label: 'البلاغات', icon: Flag },
  { view: 'admin-analytics' as const, label: 'الإحصائيات', icon: BarChart3 },
];

function AdminNav({ active }: { active: string }) {
  const { navigate, setAdminMode } = useAppStore();
  const { logout } = useAuth();

  const handleLogout = async () => {
    setAdminMode(false);
    await logout();
  };

  const navContent = (
    <div className="flex flex-col gap-1 py-4">
      <div className="flex items-center gap-3 px-4 pb-4 mb-2 border-b border-border/50">
        <img src="/at-icon.png" alt="AT" width={32} height={32} className="rounded-lg" />
        <div>
          <p className="font-bold text-sm">لوحة الإدارة</p>
          <p className="text-xs text-muted-foreground">عدن تويتر</p>
        </div>
      </div>
      {adminNavItems.map((item) => (
        <button
          key={item.view}
          onClick={() => navigate(item.view)}
          className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg mx-2 transition-colors ${
            active === item.view
              ? 'bg-emerald-500/10 text-emerald-500 font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </button>
      ))}
      <div className="mt-auto pt-4 border-t border-border/50 mt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg mx-2 w-[calc(100%-1rem)]"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 border-l border-border/30 flex-col h-screen sticky top-0 bg-background">
        {navContent}
      </aside>

      {/* Mobile header + sheet */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/at-icon.png" alt="AT" width={28} height={28} className="rounded-lg" />
          <span className="font-bold text-sm">الإدارة</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            {navContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function AdminDashboardView() {
  const { navigate, setAdminMode } = useAppStore();

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [todayPosts, setTodayPosts] = useState(0);
  const [activeReports, setActiveReports] = useState(0);
  const [recentUsers, setRecentUsers] = useState<(UserData & { uid: string })[]>([]);
  const [recentPosts, setRecentPosts] = useState<PostData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      if (!snapshot.exists()) {
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const allUsers: (UserData & { uid: string })[] = [];
      const map: Record<string, UserData> = {};

      for (const [uid, val] of Object.entries(data)) {
        const user = val as UserData;
        allUsers.push({ ...user, uid });
        map[uid] = user;
      }

      setUsersMap(map);
      setTotalUsers(allUsers.length);

      // Sort by createdAt descending, get latest 5
      allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRecentUsers(allUsers.slice(0, 5));
      setLoading(false);
    });
    return () => off(usersRef);
  }, []);

  const fetchPosts = useCallback(() => {
    const postsRef = ref(db, 'posts');
    const unsub = onValue(postsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      const allPosts: PostData[] = [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTs = todayStart.getTime();
      let todayCount = 0;

      for (const [id, val] of Object.entries(data)) {
        const post = val as PostData;
        if (!post.isDeleted) {
          allPosts.push({ ...post, id });
          if (post.timestamp >= todayTs) {
            todayCount++;
          }
        }
      }

      allPosts.sort((a, b) => b.timestamp - a.timestamp);
      setTotalPosts(allPosts.length);
      setTodayPosts(todayCount);
      setRecentPosts(allPosts.slice(0, 5));
    });
    return () => off(postsRef);
  }, []);

  const fetchReports = useCallback(() => {
    const reportsRef = query(ref(db, 'reports'), orderByChild('status'), equalTo('pending'));
    const unsub = onValue(reportsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveReports(0);
        return;
      }
      setActiveReports(Object.keys(snapshot.val()).length);
    });
    return () => off(reportsRef);
  }, []);

  useEffect(() => {
    const unsubUsers = fetchUsers();
    const unsubPosts = fetchPosts();
    const unsubReports = fetchReports();
    return () => {
      unsubUsers();
      unsubPosts();
      unsubReports();
    };
  }, [fetchUsers, fetchPosts, fetchReports]);

  const handleExit = () => {
    setAdminMode(false);
    navigate('home');
  };

  const formatTime = (ts: number) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const stats = [
    { label: 'إجمالي المستخدمين', value: totalUsers, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'إجمالي المنشورات', value: totalPosts, icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'المنشورات اليوم', value: todayPosts, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'البلاغات النشطة', value: activeReports, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <AdminNav active="admin-dashboard" />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminNav active="admin-dashboard" />

      <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/at-icon.png" alt="AT" width={36} height={36} className="rounded-xl hidden lg:block" />
            <div>
              <h1 className="text-xl font-bold">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground">مرحبًا بك في لوحة إدارة عدن تويتر</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExit}>
              <ArrowRight className="h-4 w-4 ml-1" />
              العودة للتطبيق
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 rounded-xl"
            onClick={() => navigate('admin-users')}
          >
            <Users className="h-5 w-5 text-emerald-500" />
            <span className="text-xs">إدارة المستخدمين</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 rounded-xl"
            onClick={() => navigate('admin-reports')}
          >
            <Shield className="h-5 w-5 text-orange-500" />
            <span className="text-xs">المراجعة</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 rounded-xl"
            onClick={() => navigate('admin-analytics')}
          >
            <BarChart3 className="h-5 w-5 text-amber-500" />
            <span className="text-xs">الإحصائيات</span>
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Users */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>أحدث المستخدمين</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-500"
                  onClick={() => navigate('admin-users')}
                >
                  عرض الكل
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مستخدمين</p>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.uid} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarBase64} />
                      <AvatarFallback>{user.fullName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {user.fullName}
                        {user.isVerified && (
                          <span className="text-emerald-500 mr-1">✓</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{formatTime(user.createdAt)}</p>
                      {user.isSuspended && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">معلّق</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>أحدث المنشورات</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-500"
                  onClick={() => navigate('admin-posts')}
                >
                  عرض الكل
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد منشورات</p>
              ) : (
                recentPosts.map((post) => {
                  const author = usersMap[post.userId];
                  return (
                    <div key={post.id} className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={author?.avatarBase64} />
                        <AvatarFallback>{author?.fullName?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {author?.fullName || 'مستخدم'}{' '}
                          <span className="text-xs text-muted-foreground font-normal">
                            {formatTime(post.timestamp)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}