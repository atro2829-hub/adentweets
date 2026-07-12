'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, MoreHorizontal, Eye, Trash2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useAppStore } from '@/store/app-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off, update, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { PostData, UserData } from '@/lib/types';
import { toast } from 'sonner';

const tabs = [
  { key: 'all', label: 'الكل' },
  { key: 'reported', label: 'المبلغ عنها' },
  { key: 'recent', label: 'الأخيرة' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

const PAGE_SIZE = 15;

export function AdminPostsView() {
  const { setSelectedPostId, navigate } = useAppStore();
  const [allPosts, setAllPosts] = useState<{ id: string; data: PostData; author: UserData | null }[]>([]);
  const [userCache, setUserCache] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; content: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  // Fetch users
  const fetchUser = useCallback(async (userId: string): Promise<UserData | null> => {
    if (userCache[userId]) return userCache[userId];
    try {
      const snap = await get(ref(db, `users/${userId}`));
      if (snap.exists()) {
        const data = snap.val() as UserData;
        setUserCache((prev) => ({ ...prev, [userId]: data }));
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, [userCache]);

  // Listen to posts
  useEffect(() => {
    const postsRef = ref(db, 'posts');
    const unsub = onValue(postsRef, async (snap) => {
      if (!snap.exists()) {
        setAllPosts([]);
        setLoading(false);
        return;
      }
      const raw = snap.val() as Record<string, PostData>;
      const entries: { id: string; data: PostData; author: UserData | null }[] = [];

      for (const [id, data] of Object.entries(raw)) {
        if (data.isDeleted) continue;
        const author = await fetchUser(data.userId);
        entries.push({ id, data, author });
      }
      entries.sort((a, b) => b.data.timestamp - a.data.timestamp);
      setAllPosts(entries);
      setLoading(false);
    });
    return () => off(postsRef);
  }, [fetchUser]);

  // Listen to reports for reported posts
  useEffect(() => {
    const reportsRef = ref(db, 'reports');
    const unsub = onValue(reportsRef, (snap) => {
      if (!snap.exists()) return;
      const raw = snap.val() as Record<string, { targetPostId?: string }>;
      const ids = new Set<string>();
      for (const r of Object.values(raw)) {
        if (r.targetPostId) ids.add(r.targetPostId);
      }
      setReportedIds(ids);
    });
    return () => off(reportsRef);
  }, []);

  const filtered = useMemo(() => {
    let list = allPosts;

    if (activeTab === 'reported') {
      list = list.filter((p) => reportedIds.has(p.id));
    } else if (activeTab === 'recent') {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      list = list.filter((p) => p.data.timestamp >= dayAgo);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.data.content?.toLowerCase().includes(q));
    }

    return list;
  }, [allPosts, activeTab, search, reportedIds]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await update(ref(db, `posts/${deleteTarget.id}`), { isDeleted: true });
      toast.success('تم حذف المنشور');
      setDeleteTarget(null);
    } catch {
      toast.error('حدث خطأ');
    }
    setActionLoading(false);
  }, [deleteTarget]);

  const handleViewPost = (postId: string) => {
    setSelectedPostId(postId);
    navigate('post-detail');
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav activeView="admin-posts" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المحتوى..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pr-10"
            />
          </div>
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  activeTab === tab.key
                    ? 'bg-accent font-bold text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))
          ) : paged.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>لا يوجد منشورات</p>
            </div>
          ) : (
            paged.map(({ id, data, author }) => (
              <Card key={id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Author */}
                    <button
                      onClick={() => author && navigate('profile')}
                      className="shrink-0"
                    >
                      {author?.avatarBase64 ? (
                        <img src={`data:image/jpeg;base64,${author.avatarBase64}`} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {author?.fullName?.charAt(0) || 'م'}
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-sm truncate">{author?.fullName || 'مستخدم'}</span>
                          <span className="text-xs text-muted-foreground truncate">@{author?.username}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(data.timestamp)}</span>
                        </div>
                        {reportedIds.has(id) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 shrink-0">
                            مبلّغ عنها
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-sm mt-1 line-clamp-2">
                        {data.content.length > 100 ? data.content.slice(0, 100) + '...' : data.content}
                      </p>

                      {/* Image + Stats */}
                      <div className="flex items-center gap-3 mt-2">
                        {data.imageBase64 && (
                          <img
                            src={`data:image/jpeg;base64,${data.imageBase64}`}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>❤ {data.likesCount}</span>
                          <span>💬 {data.commentsCount}</span>
                          <span>🔄 {data.repostsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewPost(id)}>
                          <Eye className="h-4 w-4 ml-2" /> عرض
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-400" onClick={() => setDeleteTarget({ id, content: data.content.slice(0, 50) })}>
                          <Trash2 className="h-4 w-4 ml-2" /> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنشور؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المنشور: &quot;{deleteTarget?.content}...&quot;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

