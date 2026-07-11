'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  LogOut,
  LayoutDashboard,
  UserCog,
  MessageSquare,
  Flag,
  BarChart3,
  Users,
  FileText,
  MessageCircle,
  Heart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { UserData, PostData, CommentData } from '@/lib/types';

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
      <aside className="hidden lg:flex w-60 shrink-0 border-l border-border/30 flex-col h-screen sticky top-0 bg-background">
        {navContent}
      </aside>
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

const CHART_COLORS = ['#10b981', '#f97316', '#eab308', '#6b7280'];

interface DayBucket {
  date: string;
  users: number;
  posts: number;
}

export function AdminAnalyticsView() {
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const [allComments, setAllComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub1 = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const users: UserData[] = Object.values(data) as UserData[];
        setAllUsers(users);
      }
      setLoading(false);
    });

    const postsRef = ref(db, 'posts');
    const unsub2 = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const posts: PostData[] = [];
        for (const [id, val] of Object.entries(data)) {
          const p = val as PostData;
          if (!p.isDeleted) posts.push({ ...p, id });
        }
        setAllPosts(posts);
      }
    });

    const commentsRef = ref(db, 'comments');
    const unsub3 = onValue(commentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const comments: CommentData[] = [];
        for (const [id, val] of Object.entries(data)) {
          const c = val as CommentData;
          if (!c.isDeleted) comments.push({ ...c, id });
        }
        setAllComments(comments);
      }
    });

    return () => {
      off(usersRef);
      off(postsRef);
      off(commentsRef);
    };
  }, []);

  // Aggregate data by day (last 14 days)
  const dailyData = useMemo((): DayBucket[] => {
    const days: DayBucket[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayTs = d.getTime();
      const dayEndTs = dayEnd.getTime();
      const dateStr = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

      days.push({
        date: dateStr,
        users: allUsers.filter((u) => u.createdAt >= dayTs && u.createdAt < dayEndTs).length,
        posts: allPosts.filter((p) => p.timestamp >= dayTs && p.timestamp < dayEndTs).length,
      });
    }
    return days;
  }, [allUsers, allPosts]);

  // Content distribution for pie chart
  const contentDistribution = useMemo(() => {
    const withImages = allPosts.filter((p) => p.imageBase64).length;
    const textOnly = allPosts.length - withImages;
    return [
      { name: 'بالصور', value: withImages },
      { name: 'نص فقط', value: textOnly },
    ];
  }, [allPosts]);

  // Summary stats
  const totalLikes = useMemo(() => {
    return allPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
  }, [allPosts]);

  const summaryStats = [
    { label: 'إجمالي المستخدمين', value: allUsers.length, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'إجمالي المنشورات', value: allPosts.length, icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'إجمالي التعليقات', value: allComments.length, icon: MessageCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'إجمالي الإعجابات', value: totalLikes, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border border-border/50 rounded-lg p-2.5 shadow-lg text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <AdminNav active="admin-analytics" />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl mb-4" />
          <Skeleton className="h-72 rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminNav active="admin-analytics" />

      <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold mb-6">الإحصائيات</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {summaryStats.map((stat) => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{stat.value.toLocaleString('ar-EG')}</p>
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Growth Line Chart */}
        <Card className="border-border/50 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">نمو المستخدمين (آخر 14 يوم)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="مستخدمون جدد"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Posts Bar Chart */}
        <Card className="border-border/50 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">المنشورات اليومية (آخر 14 يوم)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="posts"
                    name="منشورات"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Content Distribution Pie Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">توزيع المحتوى</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 lg:h-72 flex items-center justify-center">
              {allPosts.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد بيانات كافية</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {contentDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
              {contentDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}