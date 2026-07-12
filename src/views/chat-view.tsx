'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ImagePlus, Send, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off, push, set, update, onDisconnect } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { ChatMessage, UserData } from '@/lib/types';
import { VerificationBadge } from '@/components/layout/verification-badge';
import { toast } from 'sonner';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="text-xs text-muted-foreground">يكتب</span>
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  showTimestamp,
}: {
  msg: ChatMessage;
  isMine: boolean;
  showTimestamp: boolean;
}) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[75%] px-3.5 py-2',
          isMine
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
            : 'bg-card border border-border rounded-2xl rounded-bl-sm'
        )}
      >
        {msg.type === 'image' && msg.imageBase64 && (
          <img
            src={`data:image/jpeg;base64,${msg.imageBase64}`}
            alt="صورة"
            className="max-w-[240px] rounded-xl mb-1.5"
          />
        )}
        {msg.content && msg.type !== 'image' && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
        )}
        {msg.type === 'image' && msg.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1">{msg.content}</p>
        )}
        <div className={cn('flex items-center gap-1 mt-1', isMine ? 'justify-start' : 'justify-end')}>
          {showTimestamp && (
            <span className={cn('text-[10px]', isMine ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
              {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {isMine && (
            <span className="text-primary-foreground/60">
              {msg.isRead ? (
                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{date}</span>
    </div>
  );
}

export function ChatView() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { selectedConversationId, selectedConversationUser, goBack } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<UserData | null>(selectedConversationUser);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const convId = selectedConversationId;

  // Fetch other user if not provided
  useEffect(() => {
    if (selectedConversationUser) {
      setOtherUser(selectedConversationUser);
      return;
    }
    if (!convId || !uid) return;
    const fetchOther = async () => {
      try {
        const snap = await get(ref(db, `conversations/${convId}/participants`));
        if (snap.exists()) {
          const parts = snap.val() as string[];
          const otherId = parts.find((p: string) => p !== uid);
          if (otherId) {
            const uSnap = await get(ref(db, `users/${otherId}`));
            if (uSnap.exists()) setOtherUser(uSnap.val() as UserData);
          }
        }
      } catch { /* ignore */ }
    };
    fetchOther();
  }, [convId, uid, selectedConversationUser]);

  // Listen to messages
  useEffect(() => {
    if (!convId) return;
    setLoading(true);
    const msgRef = ref(db, `messages/${convId}`);
    const unsub = onValue(msgRef, (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const list: ChatMessage[] = Object.values(raw)
          .map((v: unknown) => v as ChatMessage)
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(list);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });
    return () => off(msgRef);
  }, [convId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!convId || !uid || messages.length === 0) return;
    const unreadUpdates: Record<string, boolean> = {};
    let hasUnread = false;
    for (const msg of messages) {
      if (msg.recipientId === uid && !msg.isRead) {
        unreadUpdates[`messages/${convId}/${msg.id}/isRead`] = true;
        hasUnread = true;
      }
    }
    if (hasUnread) {
      update(ref(db), unreadUpdates).catch(() => {});
    }
  }, [convId, uid, messages]);

  // Listen to other user typing
  useEffect(() => {
    if (!convId || !uid || !otherUser) return;
    const otherId = otherUser.username || '';
    if (!otherId) return;
    const typingRef = ref(db, `typing/${convId}/${otherId}`);
    const unsub = onValue(typingRef, (snap) => {
      setOtherTyping(!!snap.val());
    });
    return () => off(typingRef);
  }, [convId, uid, otherUser]);

  // Set typing status
  const setTyping = useCallback(
    (val: boolean) => {
      if (!convId || !uid) return;
      set(ref(db, `typing/${convId}/${uid}`), val).catch(() => {});
    },
    [convId, uid]
  );

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (convId && uid) {
        set(ref(db, `typing/${convId}/${uid}`), false).catch(() => {});
      }
    };
  }, [convId, uid]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!convId || !uid || !otherUser) return;
    const trimmed = text.trim();
    if (!trimmed && !imageBase64) return;
    setSending(true);

    try {
      const msgData = {
        senderId: uid,
        recipientId: otherUser.username,
        content: trimmed,
        imageBase64: imageBase64 || '',
        timestamp: Date.now(),
        isRead: false,
        type: imageBase64 ? 'image' as const : 'text' as const,
      };
      const newMsgRef = push(ref(db, `messages/${convId}`));
      await set(newMsgRef, { ...msgData, id: newMsgRef.key });

      await update(ref(db, `conversations/${convId}`), {
        lastMessage: imageBase64 ? '📷 صورة' : trimmed,
        lastMessageTimestamp: Date.now(),
        lastMessageSenderId: uid,
      });

      setText('');
      setImageBase64(null);
      setTyping(false);
    } catch {
      toast.error('فشل إرسال الرسالة');
    }
    setSending(false);
  }, [convId, uid, otherUser, text, imageBase64, setTyping]);

  // Handle image pick
  const handleImagePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يتجاوز 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  // Key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages with date separators and timestamp gaps
  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate = '';
    let lastTimestamp = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgDate = new Date(msg.timestamp).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Date separator
      if (msgDate !== lastDate) {
        elements.push(<DateSeparator key={`date-${i}`} date={msgDate} />);
        lastDate = msgDate;
        lastTimestamp = 0;
      }

      // Timestamp gap (5 min)
      const showTimestamp = msg.timestamp - lastTimestamp > 5 * 60 * 1000;
      lastTimestamp = msg.timestamp;

      elements.push(
        <MessageBubble
          key={msg.id || i}
          msg={msg}
          isMine={msg.senderId === uid}
          showTimestamp={showTimestamp}
        />
      );
    }
    return elements;
  };

  const onlineStatus = otherUser?.isOnline
    ? 'متصل الآن'
    : otherUser?.lastSeen
      ? `آخر ظهور منذ ${formatRelativeTime(otherUser.lastSeen)}`
      : 'غير متصل';

  if (!convId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
        <p className="text-lg">لم يتم اختيار محادثة</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-3 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          {otherUser?.avatarBase64 ? (
            <img
              src={`data:image/jpeg;base64,${otherUser.avatarBase64}`}
              alt={otherUser.fullName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {otherUser?.fullName?.charAt(0) || 'م'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">{otherUser?.fullName || 'مستخدم'}</span>
              <VerificationBadge type={otherUser?.verificationType} size="sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground truncate">@{otherUser?.username}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className={cn('text-xs', otherUser?.isOnline ? 'text-emerald-400' : 'text-muted-foreground')}>
                {onlineStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-4 py-3 space-y-1">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className={cn('h-12 rounded-2xl max-w-[75%]', i % 2 === 0 ? 'mr-auto' : 'ml-auto')} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-lg font-medium">ابدأ المحادثة</p>
              <p className="text-sm mt-1">أرسل أول رسالة</p>
            </div>
          ) : (
            renderMessages()
          )}
          {otherTyping && <TypingIndicator />}
        </div>
      </ScrollArea>

      {/* Image Preview */}
      <AnimatePresence>
        {imageBase64 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="relative inline-block">
              <img
                src={`data:image/jpeg;base64,${imageBase64}`}
                alt="معاينة"
                className="h-20 rounded-xl object-cover"
              />
              <button
                onClick={() => setImageBase64(null)}
                className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setTyping(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTyping(false)}
            placeholder="اكتب رسالة..."
            className="flex-1 h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
            disabled={sending}
            autoFocus
          />
          <Button
            size="icon"
            className="shrink-0 h-9 w-9 rounded-full"
            onClick={sendMessage}
            disabled={sending || (!text.trim() && !imageBase64)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}