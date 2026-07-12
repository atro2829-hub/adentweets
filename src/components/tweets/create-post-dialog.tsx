'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { AvatarCircle } from '@/components/tweets/post-card';
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
import { ImagePlus, Film, X, PenSquare, Loader2 } from 'lucide-react';
import { ref, push, get, update, set as firebaseSet } from 'firebase/database';
import { db } from '@/lib/firebase';
import { cn, compressImage } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { PostData, UserData } from '@/lib/types';

const MAX_CHARS = 280;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 4;

function ComposeContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user, userData } = useAuth();
  const {
    replyToPostId,
    setReplyToPostId,
    quotePostId,
    setQuotePostId,
  } = useAppStore();
  const userId = user?.uid;

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToUser, setReplyingToUser] = useState<UserData | null>(null);
  const [quotePost, setQuotePost] = useState<PostData | null>(null);
  const [quoteAuthor, setQuoteAuthor] = useState<UserData | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatar = userData?.avatarBase64 || '';
  const name = userData?.fullName || 'مستخدم';
  const username = userData?.username || 'user';

  const charCount = content.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = remaining < 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

  // Load reply-to user info
  useEffect(() => {
    if (!replyToPostId) return;
    get(ref(db, `posts/${replyToPostId}`)).then((snap) => {
      if (snap.exists()) {
        const data = snap.val() as PostData;
        if (data.userId) {
          get(ref(db, `users/${data.userId}`)).then((userSnap) => {
            if (userSnap.exists()) setReplyingToUser(userSnap.val() as UserData);
          });
        }
      }
    });
  }, [replyToPostId]);

  // Load quote post info
  useEffect(() => {
    if (!quotePostId) return;
    get(ref(db, `posts/${quotePostId}`)).then((snap) => {
      if (snap.exists()) {
        const data = snap.val() as PostData;
        setQuotePost(data);
        if (data.userId) {
          get(ref(db, `users/${data.userId}`)).then((userSnap) => {
            if (userSnap.exists()) setQuoteAuthor(userSnap.val() as UserData);
          });
        }
      }
    });
  }, [quotePostId]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`;
  }, [content]);

  // Auto-focus
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (images.length >= MAX_IMAGES) {
        toast.error(`يمكنك إضافة ${MAX_IMAGES} صور كحد أقصى`);
        break;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        continue;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('يجب أن تكون الصورة بصيغة JPEG أو PNG');
        continue;
      }
      try {
        const base64 = await compressImage(file, 1200, 0.7);
        setImages((prev) => [...prev, base64]);
      } catch {
        toast.error('فشل في معالجة الصورة');
      }
    }
    e.target.value = '';
  }, [images.length]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !userId) return;

    setIsSubmitting(true);
    try {
      const mainImage = images[0] || '';

      // If replying
      if (replyToPostId) {
        const commentRef = push(ref(db, 'comments'));
        await firebaseSet(ref(db, `comments/${commentRef.key}`), {
          id: commentRef.key,
          postId: replyToPostId,
          userId,
          content: content.trim(),
          imageBase64: mainImage,
          timestamp: Date.now(),
          likesCount: 0,
          parentId: null,
          isDeleted: false,
        });

        // Increment comment count
        const snap = await get(ref(db, `posts/${replyToPostId}/commentsCount`));
        await update(ref(db, `posts/${replyToPostId}`), {
          commentsCount: (snap.val() || 0) + 1,
        });
        toast.success('تم نشر الرد بنجاح');
      } else {
        // New post or quote
        const postData = {
          id: '',
          userId,
          content: content.trim(),
          imageBase64: mainImage,
          timestamp: Date.now(),
          likesCount: 0,
          commentsCount: 0,
          repostsCount: 0,
          viewsCount: 0,
          bookmarksCount: 0,
          isDeleted: false,
          isPinned: false,
          isQuote: !!quotePostId,
          quotePostId: quotePostId || '',
          repostedBy: '',
          originalPostId: '',
        };

        const postRef = push(ref(db, 'posts'));
        await firebaseSet(ref(db, `posts/${postRef.key}`), { ...postData, id: postRef.key });

        // Increment user's postsCount
        const countSnap = await get(ref(db, `users/${userId}/postsCount`));
        await update(ref(db, `users/${userId}`), {
          postsCount: (countSnap.val() || 0) + 1,
        });

        toast.success('تم النشر بنجاح');
      }

      setContent('');
      setImages([]);
      setReplyToPostId(null);
      setQuotePostId(null);
      onClose();
    } catch {
      toast.error('حدث خطأ أثناء النشر');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissReply = () => {
    setReplyToPostId(null);
  };

  const handleDismissQuote = () => {
    setQuotePostId(null);
  };

  return (
    <div className="flex gap-3 p-4">
      {/* Avatar */}
      <AvatarCircle base64={avatar} name={name} className="h-10 w-10" />

      <div className="flex-1 flex flex-col gap-2">
        {/* Name + username + badge */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm">{name}</span>
          {userData?.isVerified && (
            <VerificationBadge type={userData.verificationType || 'blue'} size="sm" />
          )}
          <span className="text-muted-foreground text-sm">@{username}</span>
        </div>

        {/* Reply to indicator */}
        {replyToPostId && replyingToUser && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>الرد على</span>
            <span className="text-foreground font-medium">@{replyingToUser.username}</span>
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={handleDismissReply}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="ما الذي يحدث؟"
          className="min-h-[120px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 p-0 placeholder:text-muted-foreground/50 leading-relaxed"
          dir="rtl"
          maxLength={MAX_CHARS + 50}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        {/* Image previews */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'grid gap-2',
                images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              )}
            >
              {images.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    'relative rounded-xl overflow-hidden border border-border/50',
                    images.length === 1 ? 'max-h-[300px]' : 'max-h-[180px]'
                  )}
                >
                  <img
                    src={`data:image/jpeg;base64,${img}`}
                    alt={`صورة ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                    onClick={() => removeImage(i)}
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quote post preview */}
        {quotePostId && quotePost && (
          <div className="rounded-2xl border border-border/50 p-3 bg-accent/20">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <AvatarCircle
                  base64={quoteAuthor?.avatarBase64 || ''}
                  name={quoteAuthor?.fullName || 'مستخدم'}
                  className="h-5 w-5"
                />
                <span className="text-xs font-bold">{quoteAuthor?.fullName || 'مستخدم'}</span>
                {quoteAuthor?.isVerified && (
                  <VerificationBadge type={quoteAuthor.verificationType || 'blue'} size="sm" />
                )}
              </div>
              <button type="button" onClick={handleDismissQuote} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{quotePost.content}</p>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-1">
          {/* Image buttons */}
          <div className="flex gap-0.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 rounded-full opacity-50"
              disabled
            >
              <Film className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Character counter */}
            <AnimatePresence>
              {charCount > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'text-xs tabular-nums',
                    remaining < 20 ? 'text-rose-500' : 'text-muted-foreground'
                  )}
                >
                  {MAX_CHARS - charCount}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <Button
              size="sm"
              className="rounded-full px-5 font-bold h-9"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenSquare className="h-4 w-4 ml-1" />
              )}
              نشر
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreatePostDialog() {
  const {
    isComposeOpen,
    setComposeOpen,
    replyToPostId,
    setReplyToPostId,
    quotePostId,
    setQuotePostId,
  } = useAppStore();
  const isMobile = useIsMobile();

  const handleClose = (open: boolean) => {
    if (!open) {
      setComposeOpen(false);
      if (replyToPostId) setReplyToPostId(null);
      if (quotePostId) setQuotePostId(null);
    }
  };

  const onClose = () => {
    setComposeOpen(false);
    if (replyToPostId) setReplyToPostId(null);
    if (quotePostId) setQuotePostId(null);
  };

  const title = replyToPostId ? 'رد على التغريدة' : quotePostId ? 'نقل التغريدة' : 'تغريدة جديدة';

  if (isMobile) {
    return (
      <Sheet open={isComposeOpen} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className="sm:max-w-lg mx-auto rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader className="flex flex-row items-center justify-between border-b border-border/50 px-4 py-3 -mx-4 -mt-4 mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-lg font-bold">{title}</SheetTitle>
            <div className="w-9" />
          </SheetHeader>
          <ComposeContent onClose={onClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isComposeOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="w-9" />
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        <ComposeContent onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}