'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Bell, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminNav } from '@/components/layout/admin-nav';
import { useAppStore } from '@/store/app-store';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { UserData, PostData, ReportData } from '@/lib/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
  bg: string;
  index: number;
}

function AnimatedStatCard({ icon: Icon, label, value, accent, bg, index }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.floor(value / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon className={cn('h-5 w-5', accent)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(displayed)}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AdminDashboardView() {
  const { navigate, setViewParams, setSelectedPostId } = useAppStore();
  const [totalUsers, setTotalUsers] = useState(0);
  const [todayPosts, setTodayPosts] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [recentUsers, setRecentUsers] = useState<{ id: string; data: UserData }[]>([]);
  const [recentPosts, setRecentPosts] = useState<{ id: string; data: PostData; author: UserData | null }[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ name: string; users: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refs: ReturnType<typeof onValue>[] = [];

    // Users
    const usersRef = ref(db, 'users');
    const u1 = onValue(usersRef, (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const raw = snap.val() as Record<string, UserData>;
      const entries = Object.entries(raw);
      setTotalUsers(entries.length);

      // Recent users (last 5 by createdAt)
      const sorted = entries
        .sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);
      setRecentUsers(sorted.map(([id, data]) => ({ id, data })));

      // User growth chart (last 7 days)
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const growth: { name: string; users: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = now - i * dayMs;
        const dayEnd = dayStart + dayMs;
        const label = new Date(dayStart).toLocaleDateString('ar-EG', { weekday: 'short' });
        const count = entries.filter(
          ([, u]) => (u.createdAt || 0) >= dayStart && (u.createdAt || 0) < dayEnd
        ).length;
        growth.push({ name: label, users: count });
      }
      setUserGrowthData(growth);
      setLoading(false);
    });
    refs.push(u1);

    // Posts
    const postsRef = ref(db, 'posts');
    const p1 = onValue(postsRef, (snap) => {
      if (!snap.exists()) return;
      const raw = snap.val() as Record<string, PostData>;
      const entries = Object.entries(raw);
      setTotalPosts(entries.length);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const today = entries.filter(
        ([, p]) => !p.isDeleted && p.timestamp >= todayStart.getTime()
      ).length;
      setTodayPosts(today);

      // Recent posts
      const sorted = entries
        .filter(([, p]) => !p.isDeleted)
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(0, 5);

      const withAuthors = sorted.map(([id, data]) => {
        const authorSnap = snap; // We'd need to fetch from users
        return { id, data, author: null };
      });
      setRecentPosts(withAuthors);
    });
    refs.push(p1);

    // Reports
    const reportsRef = ref(db, 'reports');
    const r1 = onValue(reportsRef, (snap) => {
      if (!snap.exists()) return;
      const raw = snap.val() as Record<string, ReportData>;
      const pending = Object.values(raw).filter((r) => r.status === 'pending').length;
      setPendingReports(pending);
    });
    refs.push(r1);

    return () => refs.forEach((r) => off(r));
  }, []);

  const handleViewPost = (postId: string) => {
    setSelectedPostId(postId);
    navigate('post-detail');
  };

  const handleViewUser = (userId: string) => {
    setViewParams({ userId });
    navigate('profile');
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav activeView="admin-dashboard" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AnimatedStatCard
            icon={Users}
            label="إجمالي المستخدمين"
            value={totalUsers}
            accent="text-emerald-400"
            bg="bg-emerald-400/10"
            index={0}
          />
          <AnimatedStatCard
            icon={FileText}
            label="المنشورات اليومية"
            value={todayPosts}
            accent="text-sky-400"
            bg="bg-sky-400/10"
            index={1}
          />
          <AnimatedStatCard
            icon={Bell}
            label="إجمالي المنشورات"
            value={totalPosts}
            accent="text-amber-400"
            bg="bg-amber-400/10"
            index={2}
          />
          <AnimatedStatCard
            icon={AlertTriangle}
            label="البلاغات المعلقة"
            value={pendingReports}
            accent="text-rose-400"
            bg="bg-rose-400/10"
            index={3}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'إدارة المستخدمين', view: 'admin-users' as const, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            { label: 'مراجعة المنشورات', view: 'admin-posts' as const, color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
            { label: 'البلاغات', view: 'admin-reports' as const, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
            { label: 'الإحصائيات', view: 'admin-analytics' as const, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
          ].map((action, i) => (
            <motion.button
              key={action.view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => navigate(action.view)}
              className={cn('p-4 rounded-xl border text-sm font-medium transition-colors hover:opacity-80', action.color)}
            >
              {action.label}
            </motion.button>
          ))}
        </div>

        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm">نمو المستخدمين (آخر 7 أيام)</h3>
              </div>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#34d399"
                      fill="url(#growthGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Users + Posts */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">أحدث المستخدمين</h3>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('admin-users')}>
                    عرض الكل
                  </Button>
                </div>
                {loading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                ) : recentUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا يوجد مستخدمين</p>
                ) : (
                  <div className="space-y-2">
                    {recentUsers.map(({ id, data }) => (
                      <button
                        key={id}
                        onClick={() => handleViewUser(id)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent/50 transition-colors text-right"
                      >
                        {data.avatarBase64 ? (
                          <img src={`data:image/jpeg;base64,${data.avatarBase64}`} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {data.fullName?.charAt(0) || 'م'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{data.fullName}</p>
                          <p className="text-xs text-muted-foreground">@{data.username}</p>
                        </div>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full',
                          data.isSuspended ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                        )}>
                          {data.isSuspended ? 'معلّق' : 'نشط'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Posts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">أحدث المنشورات</h3>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('admin-posts')}>
                    عرض الكل
                  </Button>
                </div>
                {loading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                ) : recentPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا يوجد منشورات</p>
                ) : (
                  <div className="space-y-2">
                    {recentPosts.map(({ id, data }) => (
                      <button
                        key={id}
                        onClick={() => handleViewPost(id)}
                        className="flex items-start gap-3 w-full p-2 rounded-lg hover:bg-accent/50 transition-colors text-right"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {data.content.length > 60 ? data.content.slice(0, 60) + '...' : data.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatRelativeTime(data.timestamp)} · {data.likesCount} إعجاب
                          </p>
                        </div>
                        {data.imageBase64 && (
                          <img
                            src={`data:image/jpeg;base64,${data.imageBase64}`}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover shrink-0"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}