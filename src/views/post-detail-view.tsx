'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard, PostData } from '@/components/tweets/post-card';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';

export function PostDetailView() {
  const { viewParams, goBack } = useAppStore();
  const { session } = useAuth();
  const postId = viewParams.postId;

  const [post, setPost] = useState<PostData | null>(null);
  const [replies, setReplies] = useState<PostData[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    try {
      const [postRes, repliesRes] = await Promise.all([
        fetch(`/api/posts/${postId}`),
        fetch(`/api/posts/${postId}/comments?limit=30`),
      ]);

      if (postRes.ok) {
        const data = await postRes.json();
        setPost(data);
      }
      if (repliesRes.ok) {
        const data = await repliesRes.json();
        setReplies(data.comments || data.posts || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleReply = async () => {
    if (!replyContent.trim() || !postId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setReplies((prev) => [
          {
            id: newComment.id,
            content: newComment.content,
            imageUrls: newComment.imageUrls || '',
            likesCount: 0,
            commentsCount: 0,
            retweetsCount: 0,
            viewsCount: 0,
            createdAt: newComment.createdAt,
            user: {
              id: session?.user?.id || '',
              username: session?.user?.username || '',
              fullName: session?.user?.name || '',
              profileImageUrl: session?.user?.image || '',
              isVerified: false,
            },
          },
          ...prev,
        ]);
        setReplyContent('');
        toast.success('تم نشر الرد');
      }
    } catch {
      toast.error('فشل في نشر الرد');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-4 w-full mt-3" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-muted-foreground">لم يتم العثور على المنشور</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">التغريدة</h1>
      </div>

      {/* Reply Input */}
      <div className="flex gap-3 px-4 py-3 border-b border-border/50">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {session?.user?.name?.charAt(0) || 'م'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="اكتب ردك..."
            className="min-h-[60px] resize-none border-0 bg-transparent text-sm focus-visible:ring-0 p-0 placeholder:text-muted-foreground/60"
            dir="rtl"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              className="rounded-full px-4 font-bold"
              disabled={!replyContent.trim() || isSubmitting}
              onClick={handleReply}
            >
              {isSubmitting ? (
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'رد'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Post */}
      <PostCard post={post} />

      <Separator />

      {/* Replies */}
      <div className="px-4 py-2">
        <p className="text-sm font-bold text-muted-foreground">
          {replies.length > 0 ? `${replies.length} رد` : 'لا توجد ردود بعد'}
        </p>
      </div>

      {replies.length > 0 && replies.map((reply) => <PostCard key={reply.id} post={reply} />)}
    </div>
  );
}