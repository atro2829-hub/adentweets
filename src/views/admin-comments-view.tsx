'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, MoreHorizontal, Eye, Trash2, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off, remove, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { CommentData, UserData, PostData } from '@/lib/types';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

export function AdminCommentsView() {
  const { setSelectedPostId, navigate } = useAppStore();
  const [allComments, setAllComments] = useState<{ id: string; data: CommentData; author: UserData | null; post: PostData | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; content: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUser = useCallback(async (userId: string): Promise<UserData | null> => {
    try {
      const snap = await get(ref(db, `users/${userId}`));
      if (snap.exists()) return snap.val() as UserData;
    } catch { /* ignore */ }
    return null;
  }, []);

  const fetchPost = useCallback(async (postId: string): Promise<PostData | null> => {
    try {
      const snap = await get(ref(db, `posts/${postId}`));
      if (snap.exists()) return snap.val() as PostData;
    } catch { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    const commentsRef = ref(db, 'comments');
    const unsub = onValue(commentsRef, async (snap) => {
      if (!snap.exists()) {
        setAllComments([]);
        setLoading(false);
        return;
      }
      const raw = snap.val() as Record<string, CommentData>;
      const entries: typeof allComments = [];

      for (const [id, data] of Object.entries(raw)) {
        if (data.isDeleted) continue;
        const author = await fetchUser(data.userId);
        const post = data.postId ? await fetchPost(data.postId) : null;
        entries.push({ id, data, author, post });
      }
      entries.sort((a, b) => b.data.timestamp - a.data.timestamp);
      setAllComments(entries);
      setLoading(false);
    });
    return () => off(commentsRef);
  }, [fetchUser, fetchPost]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allComments;
    const q = search.trim().toLowerCase();
    return allComments.filter((c) => c.data.content?.toLowerCase().includes(q));
  }, [allComments, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await remove(ref(db, `comments/${deleteTarget.id}`));
      toast.success('تم حذف التعليق');
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
      <AdminNav activeView="admin-comments" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في التعليقات..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-10"
          />
        </div>

        {/* Comments List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))
          ) : paged.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>لا يوجد تعليقات</p>
            </div>
          ) : (
            paged.map(({ id, data, author, post }) => (
              <Card key={id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Author */}
                    {author?.avatarBase64 ? (
                      <img src={`data:image/jpeg;base64,${author.avatarBase64}`} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {author?.fullName?.charAt(0) || 'م'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm">{author?.fullName || 'مستخدم'}</span>
                          <span className="text-xs text-muted-foreground">@{author?.username}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(data.timestamp)}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {data.postId && (
                              <DropdownMenuItem onClick={() => handleViewPost(data.postId)}>
                                <Eye className="h-4 w-4 ml-2" /> عرض المنشور
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-rose-400" onClick={() => setDeleteTarget({ id, content: data.content.slice(0, 50) })}>
                              <Trash2 className="h-4 w-4 ml-2" /> حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-sm mt-1">{data.content}</p>

                      {data.imageBase64 && (
                        <img
                          src={`data:image/jpeg;base64,${data.imageBase64}`}
                          alt=""
                          className="mt-2 h-16 rounded-lg object-cover"
                        />
                      )}

                      {/* Related Post */}
                      {post && (
                        <button
                          onClick={() => handleViewPost(data.postId)}
                          className="mt-2 p-2 rounded-lg bg-muted/50 border border-border/50 w-full text-right hover:bg-accent/50 transition-colors"
                        >
                          <p className="text-xs text-muted-foreground">ردًا على منشور:</p>
                          <p className="text-xs mt-0.5 line-clamp-1">
                            {post.content.length > 80 ? post.content.slice(0, 80) + '...' : post.content}
                          </p>
                        </button>
                      )}
                    </div>
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
            <AlertDialogTitle>حذف التعليق؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا التعليق: &quot;{deleteTarget?.content}...&quot;
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