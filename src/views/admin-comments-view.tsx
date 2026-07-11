'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
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
  Search,
  MoreVertical,
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
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CommentData, UserData, PostData } from '@/lib/types';

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

export function AdminCommentsView() {
  const { navigate } = useAppStore();

  const [allComments, setAllComments] = useState<CommentData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const [postsMap, setPostsMap] = useState<Record<string, PostData>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ commentId: string; content: string } | null>(null);
  const [viewPostData, setViewPostData] = useState<PostData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const commentsRef = ref(db, 'comments');
    const unsub = onValue(commentsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAllComments([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const comments: CommentData[] = [];
      for (const [id, val] of Object.entries(data)) {
        const c = val as CommentData;
        if (!c.isDeleted) {
          comments.push({ ...c, id });
        }
      }
      comments.sort((a, b) => b.timestamp - a.timestamp);
      setAllComments(comments);
      setLoading(false);
    });
    return () => off(commentsRef);
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

  const filtered = useMemo(() => {
    if (!search.trim()) return allComments;
    const q = search.toLowerCase();
    return allComments.filter((c) => c.content?.toLowerCase().includes(q));
  }, [allComments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setActionLoading(true);
    try {
      await update(ref(db, `comments/${deleteDialog.commentId}`), { isDeleted: true });
      toast.success('تم حذف التعليق');
      setDeleteDialog(null);
    } catch {
      toast.error('فشل في حذف التعليق');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewPost = (postId: string) => {
    const post = postsMap[postId];
    if (post) {
      setViewPostData({ ...post, id: postId });
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminNav active="admin-comments" />

      <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-xl font-bold">مراجعة التعليقات</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في التعليقات..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pr-10"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} تعليق</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <Card className="border-border/50 p-8 text-center">
            <p className="text-muted-foreground">لا يوجد تعليقات</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginated.map((comment) => {
              const author = usersMap[comment.userId];
              const post = postsMap[comment.postId];
              const postAuthor = post ? usersMap[post.userId] : null;
              return (
                <Card key={comment.id} className="border-border/50 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={author?.avatarBase64} />
                      <AvatarFallback>{author?.fullName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{author?.fullName || 'مستخدم محذوف'}</p>
                        <p className="text-xs text-muted-foreground">@{author?.username || '—'}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatTime(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>

                      {/* Post context */}
                      <div
                        className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/30 cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => handleViewPost(comment.postId)}
                      >
                        <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                          <span>رد على منشور</span>
                          {postAuthor && <span>@{postAuthor.username}</span>}
                        </p>
                        {post && (
                          <p className="text-xs text-foreground/70 line-clamp-2">{post.content}</p>
                        )}
                      </div>

                      {comment.imageBase64 && (
                        <img src={comment.imageBase64} alt="" className="mt-2 rounded-lg max-h-32 object-cover" />
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleViewPost(comment.postId)}>
                          <ExternalLink className="h-4 w-4 ml-2" />
                          عرض المنشور
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteDialog({ commentId: comment.id, content: comment.content.slice(0, 60) })}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف التعليق
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

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التعليق</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا التعليق؟
              {deleteDialog && (
                <span className="block mt-2 text-foreground/70 text-xs">"{deleteDialog.content}..."</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">
              {actionLoading ? (
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Post Dialog */}
      <Dialog open={!!viewPostData} onOpenChange={(open) => !open && setViewPostData(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>المنشور المرتبط</DialogTitle>
          </DialogHeader>
          {viewPostData && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={usersMap[viewPostData.userId]?.avatarBase64} />
                    <AvatarFallback>{usersMap[viewPostData.userId]?.fullName?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{usersMap[viewPostData.userId]?.fullName || 'مستخدم'}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(viewPostData.timestamp)}</p>
                  </div>
                </div>
                <Separator />
                <p className="text-sm whitespace-pre-wrap">{viewPostData.content}</p>
                {viewPostData.imageBase64 && (
                  <img src={viewPostData.imageBase64} alt="" className="rounded-lg max-h-60 object-cover w-full" />
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}