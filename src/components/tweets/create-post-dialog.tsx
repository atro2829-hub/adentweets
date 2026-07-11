'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppStore } from '@/store/app-store';
import { ImageIcon, X, PenSquare } from 'lucide-react';
import { ref, push, get, update, set as firebaseSet } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { PostData, CommentData } from '@/lib/types';

const MAX_CHARS = 280;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

function ComposeContent({
  onClose,
  replyToPostId,
}: {
  onClose: () => void;
  replyToPostId: string | null;
}) {
  const { user, userData } = useAuth();
  const userId = user?.uid;
  const [content, setContent] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PostData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatar = userData?.avatarBase64 || '';
  const name = userData?.fullName || 'مستخدم';

  // Load reply-to post info
  useEffect(() => {
    if (!replyToPostId) return;
    const postRef = ref(db, `posts/${replyToPostId}`);
    get(postRef).then((snap) => {
      if (snap.exists()) {
        setReplyingTo(snap.val() as PostData);
      }
    });
  }, [replyToPostId]);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      setImageBase64(base64);
      setImageFile(file);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting || !userId) return;

    setIsSubmitting(true);
    try {
      const postData: Partial<PostData> = {
        userId,
        content: content.trim(),
        imageBase64: imageBase64,
        timestamp: Date.now(),
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        isDeleted: false,
      };

      // If replying
      if (replyToPostId) {
        const commentData: Partial<CommentData> = {
          postId: replyToPostId,
          userId,
          content: content.trim(),
          imageBase64: imageBase64,
          timestamp: Date.now(),
          likesCount: 0,
          parentId: null,
          isDeleted: false,
        };
        const commentRef = push(ref(db, 'comments'));
        await firebaseSet(ref(db, `comments/${commentRef.key}`), {
          ...commentData,
          id: commentRef.key,
        });

        // Increment comment count
        const postSnap = await get(ref(db, `posts/${replyToPostId}/commentsCount`));
        const currentCount = postSnap.val() || 0;
        await update(ref(db, `posts/${replyToPostId}`), {
          commentsCount: currentCount + 1,
        });
        toast.success('تم نشر الرد بنجاح');
      } else {
        // New post
        const postRef = push(ref(db, 'posts'));
        await firebaseSet(ref(db, `posts/${postRef.key}`), {
          ...postData,
          id: postRef.key,
        });

        // Increment user's postsCount
        const countSnap = await get(ref(db, `users/${userId}/postsCount`));
        const currentCount = countSnap.val() || 0;
        await update(ref(db, `users/${userId}`), {
          postsCount: currentCount + 1,
        });

        toast.success('تم نشر التغريدة بنجاح');
      }

      setContent('');
      setImageBase64('');
      setImageFile(null);
      onClose();
    } catch {
      toast.error('حدث خطأ أثناء النشر');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-3 p-4">
      {/* Avatar */}
      <div className="shrink-0">
        {avatar ? (
          <img
            src={`data:image/jpeg;base64,${avatar}`}
            alt={name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {/* Replying to info */}
        {replyingTo && (
          <div className="text-sm text-muted-foreground">
            ردًا على <span className="text-foreground font-medium">@{replyingTo.userId}</span>
          </div>
        )}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="ما الذي يحدث؟"
          className="min-h-[120px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 p-0 placeholder:text-muted-foreground/60"
          dir="rtl"
          autoFocus
        />

        {/* Image Preview */}
        {imageBase64 && (
          <div className="relative rounded-2xl overflow-hidden border border-border/50">
            <img
              src={`data:image/jpeg;base64,${imageBase64}`}
              alt="صورة"
              className="w-full max-h-48 object-cover"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80"
              onClick={() => {
                setImageBase64('');
                setImageFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span
                className={`text-xs ${
                  isOverLimit ? 'text-rose-500' : 'text-muted-foreground'
                }`}
              >
                <span className={isOverLimit ? '' : 'text-foreground'}>
                  {MAX_CHARS - charCount}
                </span>
                /{MAX_CHARS}
              </span>
            )}
            <Button
              size="sm"
              className="rounded-full px-5 font-bold"
              disabled={!content.trim() || isOverLimit || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  جاري النشر...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PenSquare className="h-4 w-4" />
                  انشر
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreatePostDialog() {
  const { isComposeOpen, setComposeOpen, replyToPostId, setReplyToPostId } = useAppStore();
  const isMobile = useIsMobile();

  const handleClose = (open: boolean) => {
    if (!open) {
      setComposeOpen(false);
      if (replyToPostId) {
        setReplyToPostId(null);
      }
    }
  };

  const onClose = () => {
    setComposeOpen(false);
    if (replyToPostId) {
      setReplyToPostId(null);
    }
  };

  const title = replyToPostId ? 'رد على التغريدة' : 'تغريدة جديدة';

  if (isMobile) {
    return (
      <Sheet open={isComposeOpen} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="sm:max-w-lg mx-auto">
          <SheetHeader className="flex flex-row items-center justify-between border-b border-border/50 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-lg font-bold">{title}</SheetTitle>
            <div className="w-9" />
          </SheetHeader>
          <ComposeContent onClose={onClose} replyToPostId={replyToPostId} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isComposeOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
        </DialogHeader>
        <ComposeContent onClose={onClose} replyToPostId={replyToPostId} />
      </DialogContent>
    </Dialog>
  );
}