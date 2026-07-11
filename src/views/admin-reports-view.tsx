'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Menu,
  LogOut,
  LayoutDashboard,
  UserCog,
  MessageSquare,
  Flag,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ReportData, UserData, PostData, CommentData } from '@/lib/types';

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

const PAGE_SIZE = 15;

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'قيد الانتظار', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  reviewed: { label: 'قيد المراجعة', className: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  resolved: { label: 'تم الحل', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  dismissed: { label: 'مرفوض', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export function AdminReportsView() {
  const { currentUserId } = useAppStore();

  const [allReports, setAllReports] = useState<(ReportData & { id: string })[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const [postsMap, setPostsMap] = useState<Record<string, PostData>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentData>>({});
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewReport, setViewReport] = useState<(ReportData & { id: string }) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const reportsRef = ref(db, 'reports');
    const unsub = onValue(reportsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAllReports([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const reports: (ReportData & { id: string })[] = [];
      for (const [id, val] of Object.entries(data)) {
        reports.push({ ...(val as ReportData), id });
      }
      reports.sort((a, b) => b.timestamp - a.timestamp);
      setAllReports(reports);
      setLoading(false);
    });
    return () => off(reportsRef);
  }, []);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      const map: Record<string, UserData> = {};
      for (const [uid, val] of Object.entries(data)) {
        map[uid] = val as UserData;
      }
      setUsersMap(map);
    });
    return () => off(usersRef);
  }, []);

  useEffect(() => {
    const postsRef = ref(db, 'posts');
    const unsub = onValue(postsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      const map: Record<string, PostData> = {};
      for (const [id, val] of Object.entries(data)) {
        map[id] = val as PostData;
      }
      setPostsMap(map);
    });
    return () => off(postsRef);
  }, []);

  useEffect(() => {
    const commentsRef = ref(db, 'comments');
    const unsub = onValue(commentsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      const map: Record<string, CommentData> = {};
      for (const [id, val] of Object.entries(data)) {
        map[id] = val as CommentData;
      }
      setCommentsMap(map);
    });
    return () => off(commentsRef);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return allReports;
    return allReports.filter((r) => r.status === filter);
  }, [allReports, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const updateStatus = async (reportId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      await update(ref(db, `reports/${reportId}`), {
        status: newStatus,
        resolvedBy: currentUserId || '',
        resolvedAt: Date.now(),
      });
      const labels: Record<string, string> = {
        reviewed: 'تم تحديد البلاغ كقيد المراجعة',
        resolved: 'تم حل البلاغ',
        dismissed: 'تم رفض البلاغ',
      };
      toast.success(labels[newStatus] || 'تم التحديث');
    } catch {
      toast.error('فشل في تحديث البلاغ');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getTargetDescription = (report: ReportData) => {
    if (report.targetPostId && postsMap[report.targetPostId]) {
      const post = postsMap[report.targetPostId];
      return `منشور: "${post.content.slice(0, 50)}..."`;
    }
    if (report.targetCommentId && commentsMap[report.targetCommentId]) {
      const comment = commentsMap[report.targetCommentId];
      return `تعليق: "${comment.content.slice(0, 50)}..."`;
    }
    if (report.targetUserId && usersMap[report.targetUserId]) {
      return `حساب: @${usersMap[report.targetUserId].username}`;
    }
    return 'محتوى محذوف';
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminNav active="admin-reports" />

      <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-xl font-bold">البلاغات</h1>
        </div>

        <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">الكل ({allReports.length})</TabsTrigger>
            <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
            <TabsTrigger value="reviewed">قيد المراجعة</TabsTrigger>
            <TabsTrigger value="resolved">تم الحل</TabsTrigger>
            <TabsTrigger value="dismissed">مرفوض</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} بلاغ</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <Card className="border-border/50 p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">لا يوجد بلاغات</p>
            <p className="text-sm text-muted-foreground/70 mt-1">ستظهر البلاغات الجديدة هنا</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginated.map((report) => {
              const reporter = usersMap[report.reporterId];
              const targetUser = usersMap[report.targetUserId];
              const statusCfg = statusConfig[report.status] || statusConfig.pending;

              return (
                <Card key={report.id} className="border-border/50 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={reporter?.avatarBase64} />
                      <AvatarFallback>{reporter?.fullName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{reporter?.fullName || 'مستخدم'}</p>
                        <span className="text-xs text-muted-foreground">أبلغ عن</span>
                        <p className="text-sm font-medium">{targetUser?.fullName || 'مستخدم'}</p>
                        <Badge variant="outline" className={`text-[10px] mr-auto ${statusCfg.className}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>

                      <div className="mt-1.5 p-2 rounded-lg bg-muted/40 text-xs">
                        <p className="text-muted-foreground mb-0.5">السبب:</p>
                        <p className="font-medium">{report.reason || '—'}</p>
                      </div>

                      <div className="mt-1.5 text-xs text-muted-foreground truncate">
                        {getTargetDescription(report)}
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-2">{formatTime(report.timestamp)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setViewReport(report)}>
                          <Eye className="h-4 w-4 ml-2" /> عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatus(report.id, 'reviewed')}
                          disabled={report.status !== 'pending' || actionLoading}
                        >
                          <Clock className="h-4 w-4 ml-2 text-sky-500" /> تحديد كقيد المراجعة
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatus(report.id, 'resolved')}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="h-4 w-4 ml-2 text-emerald-500" /> حل البلاغ
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatus(report.id, 'dismissed')}
                          disabled={actionLoading}
                        >
                          <XCircle className="h-4 w-4 ml-2 text-gray-400" /> رفض البلاغ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* View Report Dialog */}
      <Dialog open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل البلاغ</DialogTitle>
          </DialogHeader>
          {viewReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">المُبلِّغ</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={usersMap[viewReport.reporterId]?.avatarBase64} />
                      <AvatarFallback className="text-xs">{usersMap[viewReport.reporterId]?.fullName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{usersMap[viewReport.reporterId]?.fullName || '—'}</p>
                      <p className="text-xs text-muted-foreground">@{usersMap[viewReport.reporterId]?.username || '—'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">المُبلَّغ عنه</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={usersMap[viewReport.targetUserId]?.avatarBase64} />
                      <AvatarFallback className="text-xs">{usersMap[viewReport.targetUserId]?.fullName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{usersMap[viewReport.targetUserId]?.fullName || '—'}</p>
                      <p className="text-xs text-muted-foreground">@{usersMap[viewReport.targetUserId]?.username || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">السبب</p>
                <p className="text-sm">{viewReport.reason || '—'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">الحالة</p>
                <Badge variant="outline" className={statusConfig[viewReport.status]?.className}>
                  {statusConfig[viewReport.status]?.label}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">المحتوى المُبلَّغ عنه</p>
                <Card className="p-3 bg-muted/40 border-border/30">
                  <p className="text-sm">{getTargetDescription(viewReport)}</p>
                  {viewReport.targetPostId && postsMap[viewReport.targetPostId] && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                      {postsMap[viewReport.targetPostId].content}
                    </p>
                  )}
                  {viewReport.targetCommentId && commentsMap[viewReport.targetCommentId] && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                      {commentsMap[viewReport.targetCommentId].content}
                    </p>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <span>تاريخ البلاغ: </span>
                  <span>{formatTime(viewReport.timestamp)}</span>
                </div>
                {viewReport.resolvedAt && (
                  <div>
                    <span>تاريخ الحل: </span>
                    <span>{formatTime(viewReport.resolvedAt)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-2 flex-wrap">
                {viewReport.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { updateStatus(viewReport.id, 'reviewed'); setViewReport(null); }}
                    disabled={actionLoading}
                  >
                    <Clock className="h-4 w-4 ml-1 text-sky-500" /> قيد المراجعة
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { updateStatus(viewReport.id, 'resolved'); setViewReport(null); }}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 ml-1 text-emerald-500" /> حل البلاغ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { updateStatus(viewReport.id, 'dismissed'); setViewReport(null); }}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 ml-1 text-gray-400" /> رفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}