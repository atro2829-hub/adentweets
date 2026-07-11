'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, onValue, off, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  ShieldCheck,
  Trash2,
  Eye,
  Menu,
  LogOut,
  LayoutDashboard,
  UserCog,
  MessageSquare,
  Flag,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserData } from '@/lib/types';

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

export function AdminUsersView() {
  const { navigate, setViewParams } = useAppStore();

  const [allUsers, setAllUsers] = useState<(UserData & { uid: string })[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{ type: string; uid: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAllUsers([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const users: (UserData & { uid: string })[] = [];
      for (const [uid, val] of Object.entries(data)) {
        users.push({ ...(val as UserData), uid });
      }
      users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllUsers(users);
      setLoading(false);
    });
    return () => off(usersRef);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const confirmAction = (type: string, uid: string, name: string) => {
    setDialogAction({ type, uid, name });
    setDialogOpen(true);
  };

  const executeAction = async () => {
    if (!dialogAction) return;
    const { type, uid } = dialogAction;
    setActionLoading(true);
    try {
      const userRef = ref(db, `users/${uid}`);
      if (type === 'suspend' || type === 'unsuspend') {
        const user = allUsers.find((u) => u.uid === uid);
        await update(userRef, { isSuspended: type === 'suspend' ? true : false });
        toast.success(type === 'suspend' ? 'تم تعليق الحساب' : 'تم إلغاء تعليق الحساب');
      } else if (type === 'verify' || type === 'unverify') {
        await update(userRef, { isVerified: type === 'verify' ? true : false });
        toast.success(type === 'verify' ? 'تم توثيق الحساب' : 'تم إلغاء التوثيق');
      } else if (type === 'delete') {
        await remove(userRef);
        toast.success('تم حذف الحساب');
      }
    } catch {
      toast.error('فشل في تنفيذ العملية');
    } finally {
      setActionLoading(false);
      setDialogOpen(false);
      setDialogAction(null);
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const dialogMessages: Record<string, { title: string; desc: string }> = {
    suspend: { title: 'تعليق الحساب', desc: 'هل تريد تعليق هذا الحساب؟ لن يتمكن المستخدم من تسجيل الدخول.' },
    unsuspend: { title: 'إلغاء التعليق', desc: 'هل تريد إلغاء تعليق هذا الحساب؟' },
    verify: { title: 'توثيق الحساب', desc: 'هل تريد منح علامة التوثيق لهذا الحساب؟' },
    unverify: { title: 'إلغاء التوثيق', desc: 'هل تريد إزالة علامة التوثيق من هذا الحساب؟' },
    delete: { title: 'حذف الحساب', desc: 'هل أنت متأكد من حذف هذا الحساب نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.' },
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminNav active="admin-users" />

      <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-xl font-bold">إدارة المستخدمين</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pr-10"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} مستخدم</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Card className="border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">المستخدم</TableHead>
                      <TableHead className="text-xs">البريد</TableHead>
                      <TableHead className="text-xs text-center">المنشورات</TableHead>
                      <TableHead className="text-xs text-center">المتابِعون</TableHead>
                      <TableHead className="text-xs text-center">الحالة</TableHead>
                      <TableHead className="text-xs">تاريخ الانضمام</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          لا يوجد مستخدمين
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((user) => (
                        <TableRow key={user.uid}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatarBase64} />
                                <AvatarFallback>{user.fullName?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate max-w-[140px]">
                                  {user.fullName}
                                  {user.isVerified && <span className="text-emerald-500 mr-1">✓</span>}
                                  {user.isAdmin && <Badge className="text-[9px] px-1 py-0 mr-1 bg-orange-500/10 text-orange-500 border-0">مدير</Badge>}
                                </p>
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground" dir="ltr">{user.email}</TableCell>
                          <TableCell className="text-center text-sm">{user.postsCount || 0}</TableCell>
                          <TableCell className="text-center text-sm">{user.followersCount || 0}</TableCell>
                          <TableCell className="text-center">
                            {user.isSuspended ? (
                              <Badge variant="destructive" className="text-[10px]">معلّق</Badge>
                            ) : (
                              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-500 border-0">نشط</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => { setViewParams({ userId: user.uid }); navigate('profile'); }}>
                                  <Eye className="h-4 w-4 ml-2" /> عرض الملف
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => confirmAction(user.isSuspended ? 'unsuspend' : 'suspend', user.uid, user.fullName)}>
                                  {user.isSuspended ? <UserCheck className="h-4 w-4 ml-2 text-emerald-500" /> : <UserX className="h-4 w-4 ml-2 text-orange-500" />}
                                  {user.isSuspended ? 'إلغاء التعليق' : 'تعليق الحساب'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmAction(user.isVerified ? 'unverify' : 'verify', user.uid, user.fullName)}>
                                  <ShieldCheck className="h-4 w-4 ml-2" />
                                  {user.isVerified ? 'إلغاء التوثيق' : 'توثيق الحساب'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmAction('delete', user.uid, user.fullName)}>
                                  <Trash2 className="h-4 w-4 ml-2" /> حذف الحساب
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginated.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا يوجد مستخدمين</p>
              ) : (
                paginated.map((user) => (
                  <Card key={user.uid} className="border-border/50 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarBase64} />
                        <AvatarFallback>{user.fullName?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{user.fullName}</p>
                          {user.isVerified && <span className="text-emerald-500 text-xs">✓</span>}
                          {user.isSuspended ? (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">معلّق</Badge>
                          ) : (
                            <Badge className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-500 border-0">نشط</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                        <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{user.email}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{user.postsCount || 0} منشور</span>
                          <span>{user.followersCount || 0} متابع</span>
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => { setViewParams({ userId: user.uid }); navigate('profile'); }}>
                            <Eye className="h-4 w-4 ml-2" /> عرض الملف
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => confirmAction(user.isSuspended ? 'unsuspend' : 'suspend', user.uid, user.fullName)}>
                            {user.isSuspended ? <UserCheck className="h-4 w-4 ml-2 text-emerald-500" /> : <UserX className="h-4 w-4 ml-2 text-orange-500" />}
                            {user.isSuspended ? 'إلغاء التعليق' : 'تعليق الحساب'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmAction(user.isVerified ? 'unverify' : 'verify', user.uid, user.fullName)}>
                            <ShieldCheck className="h-4 w-4 ml-2" />
                            {user.isVerified ? 'إلغاء التوثيق' : 'توثيق الحساب'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirmAction('delete', user.uid, user.fullName)}>
                            <Trash2 className="h-4 w-4 ml-2" /> حذف الحساب
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Confirm Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogAction ? dialogMessages[dialogAction.type]?.title : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction ? `${dialogMessages[dialogAction.type]?.desc}\n\nالمستخدم: ${dialogAction.name}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={actionLoading}
              className={dialogAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {actionLoading ? (
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'تأكيد'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}