'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, MessageSquare, Heart, TrendingUp, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminNav } from '@/components/layout/admin-nav';
import { formatNumber } from '@/lib/utils';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { UserData, PostData, CommentData } from '@/lib/types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts';

type DateRange = '7' | '30' | '90';

const COLORS = ['#34d399', '#38bdf8', '#fbbf24'];

interface ChartDataPoint {
  name: string;
  users?: number;
  posts?: number;
  likes?: number;
  comments?: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function AdminAnalyticsView() {
  const [dateRange, setDateRange] = useState<DateRange>('7');
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [mostActiveUser, setMostActiveUser] = useState<UserData | null>(null);
  const [userGrowth, setUserGrowth] = useState<ChartDataPoint[]>([]);
  const [dailyPosts, setDailyPosts] = useState<ChartDataPoint[]>([]);
  const [dailyEngagement, setDailyEngagement] = useState<ChartDataPoint[]>([]);
  const [contentDistribution, setContentDistribution] = useState<{ name: string; value: number }[]>([]);

  const days = useMemo(() => parseInt(dateRange, 10), [dateRange]);

  const aggregateData = useCallback(async () => {
    const [usersSnap, postsSnap, commentsSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'posts')),
      get(ref(db, 'comments')),
    ]);

    const usersRaw = usersSnap.exists() ? (usersSnap.val() as Record<string, UserData>) : {};
    const postsRaw = postsSnap.exists() ? (postsSnap.val() as Record<string, PostData>) : {};
    const commentsRaw = commentsSnap.exists() ? (commentsSnap.val() as Record<string, CommentData>) : {};

    // Totals
    setTotalUsers(Object.keys(usersRaw).length);
    const activePosts = Object.values(postsRaw).filter((p) => !p.isDeleted);
    setTotalPosts(activePosts.length);
    setTotalComments(Object.keys(commentsRaw).length);

    // Total likes
    let totalLikesCount = 0;
    for (const p of activePosts) totalLikesCount += p.likesCount || 0;
    setTotalLikes(totalLikesCount);

    // Most active user
    const userPostCounts: Record<string, number> = {};
    for (const p of activePosts) {
      userPostCounts[p.userId] = (userPostCounts[p.userId] || 0) + 1;
    }
    let maxPosts = 0;
    let maxUserId = '';
    for (const [uid, count] of Object.entries(userPostCounts)) {
      if (count > maxPosts) { maxPosts = count; maxUserId = uid; }
    }
    if (maxUserId && usersRaw[maxUserId]) {
      setMostActiveUser(usersRaw[maxUserId]);
    }

    // Time-series data
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const growth: ChartDataPoint[] = [];
    const posts: ChartDataPoint[] = [];
    const engagement: ChartDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - i * dayMs;
      const dayEnd = dayStart + dayMs;
      const label = new Date(dayStart).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

      // User growth (cumulative up to this day)
      const userCount = Object.values(usersRaw).filter(
        (u) => (u.createdAt || 0) <= dayEnd
      ).length;
      growth.push({ name: label, users: userCount });

      // Posts on this day
      const dayPosts = activePosts.filter((p) => p.timestamp >= dayStart && p.timestamp < dayEnd);
      posts.push({ name: label, posts: dayPosts.length });

      // Engagement on this day
      const dayLikes = dayPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
      const dayComments = Object.values(commentsRaw).filter(
        (c) => c.timestamp >= dayStart && c.timestamp < dayEnd
      ).length;
      engagement.push({ name: label, likes: dayLikes, comments: dayComments });
    }

    setUserGrowth(growth);
    setDailyPosts(posts);
    setDailyEngagement(engagement);

    // Content distribution
    const textOnly = activePosts.filter((p) => !p.imageBase64 && !p.isQuote).length;
    const withImage = activePosts.filter((p) => !!p.imageBase64).length;
    const withQuote = activePosts.filter((p) => !!p.isQuote).length;
    setContentDistribution([
      { name: 'نص فقط', value: textOnly },
      { name: 'مع صورة', value: withImage },
      { name: 'اقتباس', value: withQuote },
    ]);

    setLoading(false);
  }, [days]);

  useEffect(() => {
    setLoading(true);
    aggregateData();
  }, [aggregateData]);

  const avgEngagement = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background">
      <AdminNav activeView="admin-analytics" />

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-6">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          {([['7', 'آخر 7 أيام'], ['30', 'آخر 30 يوم'], ['90', 'آخر 90 يوم']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateRange(val as DateRange)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                dateRange === val ? 'bg-accent font-bold text-foreground' : 'text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Users, label: 'إجمالي المستخدمين', value: formatNumber(totalUsers), color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { icon: FileText, label: 'إجمالي المنشورات', value: formatNumber(totalPosts), color: 'text-sky-400', bg: 'bg-sky-400/10' },
            { icon: TrendingUp, label: 'متوسط التفاعل', value: avgEngagement, color: 'text-amber-400', bg: 'bg-amber-400/10' },
            { icon: Crown, label: 'الأكثر نشاطًا', value: mostActiveUser?.fullName?.split(' ')[0] || '-', color: 'text-rose-400', bg: 'bg-rose-400/10' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* User Growth AreaChart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">نمو المستخدمين</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <RTooltip content={<CustomTooltip />} />
                      <defs>
                        <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="users"
                        name="المستخدمين"
                        stroke="#34d399"
                        fill="url(#userGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Posts BarChart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">المنشورات اليومية</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyPosts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <RTooltip content={<CustomTooltip />} />
                      <Bar dataKey="posts" name="المنشورات" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Content Distribution PieChart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">توزيع المحتوى</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={contentDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {contentDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Engagement LineChart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">التفاعل اليومي</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailyEngagement}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <RTooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="likes" name="إعجابات" stroke="#f43f5e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="comments" name="تعليقات" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Extra Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-rose-400">{formatNumber(totalLikes)}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الإعجابات</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-sky-400">{formatNumber(totalComments)}</p>
                  <p className="text-xs text-muted-foreground">إجمالي التعليقات</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {totalUsers > 0 ? (totalPosts / totalUsers).toFixed(1) : '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">متوسط المنشورات/مستخدم</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}