'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, MoreHorizontal, Eye, Ban, BadgeCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminNav } from '@/components/layout/admin-nav';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { useAppStore } from '@/store/app-store';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { UserData } from '@/lib/types';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

export function AdminUsersView() {
  const { setViewParams, navigate } = useAppStore();
  const [allUsers, setAllUsers] = useState<{ id: string; data: UserData }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
      if (!snap.exists()) {
        setAllUsers([]);
        setLoading(false);
        return;
      }
      const raw = snap.val() as Record<string, UserData>;
      const entries = Object.entries(raw).map(([id, data]) => ({ id, data }));
      entries.sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0));
      setAllUsers(entries);
      setLoading(false);
    });
    return () => off(usersRef);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.trim().toLowerCase();
    return allUsers.filter(
      (u) =>
        u.data.username?.toLowerCase().includes(q) ||
        u.data.fullName?.toLowerCase().includes(q) ||
        u.data.email?.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSuspend = useCallback(async (userId: string, current: boolean) => {
    setActionLoading(true);
    try {
      await update(ref(db, `users/${userId}`), { isSuspended: !current });
      toast.success(current ? 'تم إلغاء تعليق الحساب' : 'تم تعليق الحساب');
    } catch {
      toast.error('حدث خطأ');
    }
    setActionLoading(false);
  }, []);

  const handleVerify = useCallback(async (userId: string, current: boolean) => {
    setActionLoading(true);
    try {
      await update(ref(db, `users/${userId}`), {
        isVerified: !current,
        verificationType: !current ? 'blue' : 'none',
      });
      toast.success(current ? 'تم إزالة التحقق' : 'تم التحقق من الحساب');
    } catch {
      toast.error('حدث خطأ');
    }
    setActionLoading(false);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await remove(ref(db, `users/${deleteTarget.id}`));
      toast.success('تم حذف الحساب');
      setDeleteTarget(null);
    } catch {
      toast.error('حدث خطأ');
    }
    setActionLoading(false);
  }, [deleteTarget]);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav activeView="admin-users" />

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-10"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-right p-3 font-medium text-muted-foreground">المستخدم</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">البريد</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">المنشورات</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">المتابِعون</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">الحالة</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">تاريخ الانضمام</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/50">
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j} className="p-3"><Skeleton className="h-5 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      : paged.map(({ id, data }) => (
                          <tr key={id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                {data.avatarBase64 ? (
                                  <img src={`data:image/jpeg;base64,${data.avatarBase64}`} alt="" className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                    {data.fullName?.charAt(0) || 'م'}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{data.fullName}</span>
                                    <VerificationBadge type={data.verificationType} size="sm" />
                                  </div>
                                  <span className="text-xs text-muted-foreground">@{data.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs" dir="ltr">{data.email}</td>
                            <td className="p-3 text-center">{formatNumber(data.postsCount)}</td>
                            <td className="p-3 text-center">{formatNumber(data.followersCount)}</td>
                            <td className="p-3 text-center">
                              <span className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full',
                                data.isSuspended ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                              )}>
                                {data.isSuspended ? 'معلّق' : 'نشط'}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">
                              {data.createdAt ? formatRelativeTime(data.createdAt) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setViewParams({ userId: id }); navigate('profile'); }}>
                                    <Eye className="h-4 w-4 ml-2" /> عرض الملف الشخصي
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSuspend(id, data.isSuspended)}>
                                    <Ban className="h-4 w-4 ml-2" /> {data.isSuspended ? 'إلغاء التعليق' : 'تعليق الحساب'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleVerify(id, data.isVerified)}>
                                    <BadgeCheck className="h-4 w-4 ml-2" /> {data.isVerified ? 'إزالة التحقق' : 'تحقق'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-rose-400" onClick={() => setDeleteTarget({ id, name: data.fullName })}>
                                    <Trash2 className="h-4 w-4 ml-2" /> حذف الحساب
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))
            : paged.map(({ id, data }) => (
                <Card key={id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {data.avatarBase64 ? (
                        <img src={`data:image/jpeg;base64,${data.avatarBase64}`} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {data.fullName?.charAt(0) || 'م'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm truncate">{data.fullName}</span>
                            <VerificationBadge type={data.verificationType} size="sm" />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setViewParams({ userId: id }); navigate('profile'); }}>
                                <Eye className="h-4 w-4 ml-2" /> عرض الملف الشخصي
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSuspend(id, data.isSuspended)}>
                                <Ban className="h-4 w-4 ml-2" /> {data.isSuspended ? 'إلغاء التعليق' : 'تعليق الحساب'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerify(id, data.isVerified)}>
                                <BadgeCheck className="h-4 w-4 ml-2" /> {data.isVerified ? 'إزالة التحقق' : 'تحقق'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-rose-400" onClick={() => setDeleteTarget({ id, name: data.fullName })}>
                                <Trash2 className="h-4 w-4 ml-2" /> حذف الحساب
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground">@{data.username}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{formatNumber(data.postsCount)} منشور</span>
                          <span>{formatNumber(data.followersCount)} متابع</span>
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px]',
                            data.isSuspended ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          )}>
                            {data.isSuspended ? 'معلّق' : 'نشط'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف حساب {deleteTarget?.name}؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الحساب بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}