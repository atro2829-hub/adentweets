'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Repeat2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PostData, UserData } from '@/lib/types';

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

export function AdminPostsView() {
  const { navigate } = useAppStore();

  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ postId: string; content: string } | null>(null);
  const [viewPost, setViewPost] = useState<PostData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const postsRef = ref(db, 'posts');
    const unsub = onValue(postsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAllPosts([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const posts: PostData[] = [];
      for (const [id, val] of Object.entries(data)) {
        const p = val as PostData;
        if (!p.isDeleted) {
          posts.push({ ...p, id });
        }
      }
      posts.sort((a, b) => b.timestamp - a.timestamp);
      setAllPosts(posts);
      setLoading(false);
    });
    return () => off(postsRef);
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

  const filtered = useMemo(() => {
    let result = allPosts;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.content?.toLowerCase().includes(q));
    }
    if (filter === 'with-images') {
      result = result.filter((p) => p.imageBase64);
    } else if (filter === 'recent') {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      result = result.filter((p) => p.timestamp >= dayAgo);
    }
    return result;
  }, [allPosts, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setActionLoading(true);
    try {
      await update(ref(db, `posts/${deleteDialog.postId}`), { isDeleted: true });
      toast.success('تم حذف المنشور');
      setDeleteDialog(null);
    } catch {
      toast.error('فشل في حذف المنشور');
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

  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminNav active="admin-posts" />

      <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-xl font-bold">مراجعة المنشورات</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المحتوى..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pr-10"
            />
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">الكل ({allPosts.length})</TabsTrigger>
            <TabsTrigger value="with-images">بالصور</TabsTrigger>
            <TabsTrigger value="recent">اليوم</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} منشور</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <Card className="border-border/50 p-8 text-center">
            <p className="text-muted-foreground">لا يوجد منشورات</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginated.map((post) => {
              const author = usersMap[post.userId];
              return (
                <Card key={post.id} className="border-border/50 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={author?.avatarBase64} />
                      <AvatarFallback>{author?.fullName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{author?.fullName || 'مستخدم محذوف'}</p>
                        <p className="text-xs text-muted-foreground">@{author?.username || '—'}</p>
                        <span className="text-xs text-muted-foreground mr-auto">{formatTime(post.timestamp)}</span>
                      </div>
                      <p className="text-sm mt-1.5 whitespace-pre-wrap line-clamp-3">{post.content}</p>
                      {post.imageBase64 && (
                        <img
                          src={post.imageBase64}
                          alt=""
                          className="mt-2 rounded-lg max-h-40 object-cover"
                        />
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {post.likesCount || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {post.commentsCount || 0}</span>
                        <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" /> {post.repostsCount || 0}</span>
                        {post.imageBase64 && (
                          <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> صورة</span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setViewPost(post)}>
                          <Eye className="h-4 w-4 ml-2" /> عرض كامل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteDialog({ postId: post.id, content: post.content.slice(0, 60) })}
                        >
                          <Trash2 className="h-4 w-4 ml-2" /> حذف المنشور
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
            <AlertDialogTitle>حذف المنشور</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المنشور؟ سيتم إخفاؤه من التطبيق.
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
      <Dialog open={!!viewPost} onOpenChange={(open) => !open && setViewPost(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>تفاصيل المنشور</DialogTitle>
          </DialogHeader>
          {viewPost && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={usersMap[viewPost.userId]?.avatarBase64} />
                    <AvatarFallback>{usersMap[viewPost.userId]?.fullName?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{usersMap[viewPost.userId]?.fullName || 'مستخدم محذوف'}</p>
                    <p className="text-sm text-muted-foreground">@{usersMap[viewPost.userId]?.username || '—'}</p>
                  </div>
                </div>
                <Separator />
                <p className="text-sm whitespace-pre-wrap">{viewPost.content}</p>
                {viewPost.imageBase64 && (
                  <img src={viewPost.imageBase64} alt="" className="rounded-lg max-h-80 object-cover w-full" />
                )}
                <Separator />
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>📅 {formatTime(viewPost.timestamp)}</span>
                  <span>❤️ {viewPost.likesCount || 0} إعجاب</span>
                  <span>💬 {viewPost.commentsCount || 0} تعليق</span>
                  <span>🔁 {viewPost.repostsCount || 0} إعادة نشر</span>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}