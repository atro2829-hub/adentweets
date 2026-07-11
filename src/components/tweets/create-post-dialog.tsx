'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ImageIcon, X, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';

const MAX_CHARS = 280;

export function CreatePostDialog() {
  const { isCreatePostOpen, setCreatePostOpen } = useAppStore();
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;

  const handleClose = (open: boolean) => {
    if (!open) {
      setContent('');
      setImageUrl('');
      setCreatePostOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          imageUrls: imageUrl.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'فشل في إنشاء المنشور');
      }

      setContent('');
      setImageUrl('');
      setCreatePostOpen(false);
      toast.success('تم نشر التغريدة بنجاح');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء النشر');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isCreatePostOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="sm:bottom-0 sm:right-0 sm:top-0 sm:max-w-lg sm:w-full">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border/50 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => handleClose(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <SheetTitle className="text-lg font-bold">تغريدة جديدة</SheetTitle>
          <div className="w-9" />
        </SheetHeader>

        <div className="flex gap-3 p-4">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {session?.user?.name?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 flex flex-col gap-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ما الذي يحدث؟"
              className="min-h-[120px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 p-0 placeholder:text-muted-foreground/60"
              dir="rtl"
            />

            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-border/50">
                <img
                  src={imageUrl}
                  alt="صورة"
                  className="w-full max-h-48 object-cover"
                  onError={() => setImageUrl('')}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80"
                  onClick={() => setImageUrl('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-sky-400 hover:text-sky-300 hover:bg-sky-400/10"
                onClick={() => setImageUrl(' ')}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-3">
                {content.length > 0 && (
                  <span
                    className={`text-xs ${
                      isOverLimit ? 'text-rose-500' : 'text-muted-foreground'
                    }`}
                  >
                    <span className={isOverLimit ? '' : 'text-foreground'}>{MAX_CHARS - charCount}</span>/{MAX_CHARS}
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
                      <Sparkles className="h-4 w-4" />
                      انشر
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}