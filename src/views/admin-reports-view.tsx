'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Inbox, Eye, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminNav } from '@/components/layout/admin-nav';
import { useAppStore } from '@/store/app-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off, update, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { ReportData, UserData } from '@/lib/types';
import { toast } from 'sonner';

const filterTabs = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'المعلّقة' },
  { key: 'reviewed', label: 'قيد المراجعة' },
  { key: 'resolved', label: 'تم الحل' },
  { key: 'dismissed', label: 'مرفوضة' },
] as const;
type FilterKey = (typeof filterTabs)[number]['key'];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'معلّقة', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  reviewed: { label: 'قيد المراجعة', color: 'text-sky-400', bg: 'bg-sky-400/10' },
  resolved: { label: 'تم الحل', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  dismissed: { label: 'مرفوضة', color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

export function AdminReportsView() {
  const { setSelectedPostId, navigate, setViewParams } = useAppStore();
  const [allReports, setAllReports] = useState<{ id: string; data: ReportData; reporter: UserData | null; target: UserData | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedReport, setSelectedReport] = useState<typeof allReports[0] | null>(null);

  const fetchUser = useCallback(async (userId: string): Promise<UserData | null> => {
    try {
      const snap = await get(ref(db, `users/${userId}`));
      if (snap.exists()) return snap.val() as UserData;
    } catch { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    const reportsRef = ref(db, 'reports');
    const unsub = onValue(reportsRef, async (snap) => {
      if (!snap.exists()) {
        setAllReports([]);
        setLoading(false);
        return;
      }
      const raw = snap.val() as Record<string, ReportData>;
      const entries: typeof allReports = [];

      for (const [id, data] of Object.entries(raw)) {
        const reporter = await fetchUser(data.reporterId);
        const target = await fetchUser(data.targetUserId);
        entries.push({ id, data, reporter, target });
      }
      entries.sort((a, b) => b.data.timestamp - a.data.timestamp);
      setAllReports(entries);
      setLoading(false);
    });
    return () => off(reportsRef);
  }, [fetchUser]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return allReports;
    return allReports.filter((r) => r.data.status === activeFilter);
  }, [allReports, activeFilter]);

  const updateStatus = useCallback(async (reportId: string, status: ReportData['status']) => {
    try {
      await update(ref(db, `reports/${reportId}`), {
        status,
        resolvedBy: 'admin',
        resolvedAt: status === 'resolved' || status === 'dismissed' ? Date.now() : 0,
      });
      const labels: Record<string, string> = {
        reviewed: 'تم تحويل البلاغ للمراجعة',
        resolved: 'تم حل البلاغ',
        dismissed: 'تم رفض البلاغ',
      };
      toast.success(labels[status] || 'تم التحديث');
    } catch {
      toast.error('حدث خطأ');
    }
  }, []);

  const handleViewContent = (report: typeof allReports[0]) => {
    if (report.data.targetPostId) {
      setSelectedPostId(report.data.targetPostId);
      navigate('post-detail');
    } else if (report.data.targetCommentId) {
      // Could navigate to post detail with comment highlight
      toast.info('التعليقات غير متاحة حاليًا');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav activeView="admin-reports" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0',
                activeFilter === tab.key
                  ? 'bg-accent font-bold text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reports List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>لا يوجد بلاغات</p>
            </div>
          ) : (
            filtered.map((report) => {
              const sc = statusConfig[report.data.status] || statusConfig.pending;
              return (
                <Card key={report.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Reporter */}
                      {report.reporter?.avatarBase64 ? (
                        <img src={`data:image/jpeg;base64,${report.reporter.avatarBase64}`} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {report.reporter?.fullName?.charAt(0) || 'م'}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">{report.reporter?.fullName || 'مستخدم'}</span>
                            <span className="text-xs text-muted-foreground">أبلغ عن</span>
                            <span className="font-medium text-sm">{report.target?.fullName || 'مستخدم'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', sc.bg, sc.color)}>
                              {sc.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(report.data.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Reason */}
                        <p className="text-sm text-muted-foreground mt-1">{report.data.reason}</p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {(report.data.targetPostId || report.data.targetCommentId) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleViewContent(report)}
                            >
                              <Eye className="h-3.5 w-3.5 ml-1" /> عرض المحتوى
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateStatus(report.id, 'reviewed')}
                            disabled={report.data.status === 'reviewed' || report.data.status === 'resolved' || report.data.status === 'dismissed'}
                          >
                            <Clock className="h-3.5 w-3.5 ml-1" /> مراجعة
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"
                            onClick={() => updateStatus(report.id, 'resolved')}
                            disabled={report.data.status === 'resolved'}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 ml-1" /> حل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-gray-400 border-gray-400/30 hover:bg-gray-400/10"
                            onClick={() => updateStatus(report.id, 'dismissed')}
                            disabled={report.data.status === 'dismissed'}
                          >
                            <XCircle className="h-3.5 w-3.5 ml-1" /> رفض
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل البلاغ</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-3 mt-2">
              <div className="text-sm">
                <span className="text-muted-foreground">المُبلِّغ: </span>
                <span className="font-medium">{selectedReport.reporter?.fullName}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">المُبلَّغ عنه: </span>
                <span className="font-medium">{selectedReport.target?.fullName}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">السبب: </span>
                <span>{selectedReport.data.reason}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">الحالة: </span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  (statusConfig[selectedReport.data.status] || statusConfig.pending).bg,
                  (statusConfig[selectedReport.data.status] || statusConfig.pending).color,
                )}>
                  {(statusConfig[selectedReport.data.status] || statusConfig.pending).label}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">التاريخ: </span>
                <span>{formatRelativeTime(selectedReport.data.timestamp)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}