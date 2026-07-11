'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, Send, ImageIcon, X } from 'lucide-react';
import { ref, onValue, off, push, update, get, query, orderByChild } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { ChatMessage } from '@/lib/types';
import { toast } from 'sonner';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ar', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMessageTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay === 0) return formatTime(timestamp);
  if (diffDay === 1) return `أمس ${formatTime(timestamp)}`;
  return new Date(timestamp).toLocaleDateString('ar', {
    month: 'short',
    day: 'numeric',
  }) + ' ' + formatTime(timestamp);
}

export function ChatView() {
  const { user } = useAuth();
  const { selectedConversationId, selectedConversationUser, goBack, currentUserId } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myUid = user?.uid || currentUserId;
  const otherUser = selectedConversationUser;
  const conversationId = selectedConversationId;

  // Real-time listener for messages
  useEffect(() => {
    if (!conversationId) return;
    setIsLoading(true);

    const messagesRef = query(ref(db, `messages/${conversationId}`), orderByChild('timestamp'));

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const data = snapshot.val() as Record<string, Omit<ChatMessage, 'id'>>;
      const msgList: ChatMessage[] = Object.entries(data).map(([id, msg]) => ({
        id,
        ...msg,
      }));
      msgList.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgList);
      setIsLoading(false);
    }, (error) => {
      console.error('Firebase messages listener error:', error);
      toast.error('حدث خطأ في تحميل الرسائل');
      setIsLoading(false);
    });

    return () => off(messagesRef);
  }, [conversationId]);

  // Mark unread messages as read when chat is opened
  useEffect(() => {
    if (!conversationId || !myUid) return;

    const markAsRead = async () => {
      try {
        const messagesRef = ref(db, `messages/${conversationId}`);
        const snapshot = await get(messagesRef);
        if (!snapshot.exists()) return;

        const data = snapshot.val() as Record<string, { senderId: string; isRead: boolean }>;
        const updates: Record<string, boolean> = {};

        for (const [msgId, msg] of Object.entries(data)) {
          if (msg.senderId !== myUid && !msg.isRead) {
            updates[`${msgId}/isRead`] = true;
          }
        }

        if (Object.keys(updates).length > 0) {
          await update(ref(db, `messages/${conversationId}`), updates);
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markAsRead();
  }, [conversationId, myUid]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  // Handle typing indicator emission
  const handleInputChange = (val: string) => {
    setNewMessage(val);
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Set typing status
    if (myUid && conversationId && otherUser) {
      const typingRef = ref(db, `typing/${conversationId}/${myUid}`);
      update(typingRef, { isTyping: true });
      typingTimeoutRef.current = setTimeout(() => {
        update(typingRef, { isTyping: false });
      }, 2000);
    }
  };

  // Listen to other user's typing indicator
  useEffect(() => {
    if (!conversationId || !myUid || !otherUser) return;

    const otherTypingRef = ref(db, `typing/${conversationId}/${otherUser.username}`);
    const unsubscribe = onValue(otherTypingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as { isTyping: boolean };
        setIsOtherTyping(data.isTyping === true);
      } else {
        setIsOtherTyping(false);
      }
    });

    return () => off(otherTypingRef);
  }, [conversationId, myUid, otherUser]);

  // Clean up typing indicator on unmount
  useEffect(() => {
    return () => {
      if (myUid && conversationId) {
        update(ref(db, `typing/${conversationId}/${myUid}`), { isTyping: false });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [myUid, conversationId]);

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جدًا (الحد الأقصى 5 ميجابايت)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Send message
  const handleSend = async () => {
    const hasContent = newMessage.trim().length > 0 || imageBase64.length > 0;
    if (!hasContent || isSending || !myUid || !conversationId || !otherUser) return;

    const content = newMessage.trim();
    const image = imageBase64;
    setNewMessage('');
    setImageBase64('');
    setIsSending(true);

    // Clear typing indicator
    if (myUid) {
      update(ref(db, `typing/${conversationId}/${myUid}`), { isTyping: false });
    }

    try {
      // Build message content
      let messageContent = content;
      if (image) {
        messageContent = content ? `${content}\n[img:${image}]` : `[img:${image}]`;
      }

      // Push message to Firebase
      const newMsgRef = push(ref(db, `messages/${conversationId}`));
      const messageData: Omit<ChatMessage, 'id'> = {
        senderId: myUid,
        recipientId: otherUser.username,
        content: messageContent,
        timestamp: Date.now(),
        isRead: false,
      };

      await update(newMsgRef, messageData);

      // Update conversation
      const convUpdate = {
        lastMessage: content || '📷 صورة',
        lastMessageTimestamp: Date.now(),
        lastMessageSenderId: myUid,
        participants: {
          [myUid]: true,
          [otherUser.username]: true,
        },
      };
      await update(ref(db, `conversations/${conversationId}`), convUpdate);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('فشل في إرسال الرسالة');
      // Restore message
      setNewMessage(content);
      if (image) setImageBase64(image);
    } finally {
      setIsSending(false);
    }
  };

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Parse message content for images
  const parseMessageContent = (content: string) => {
    const imgRegex = /\[img:([^\]]+)\]/g;
    const parts: { type: 'text' | 'image'; value: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'image', value: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, value: content }];
  };

  const avatarSrc = otherUser?.avatarBase64
    ? `data:image/jpeg;base64,${otherUser.avatarBase64}`
    : '';
  const displayName = otherUser?.fullName || otherUser?.username || '';
  const initial = displayName.charAt(0) || 'م';

  if (!conversationId || !otherUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-57px)] md:h-screen">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="font-bold text-sm">المحادثة</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">لم يتم اختيار محادثة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] md:h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>

        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {isOtherTyping ? (
              <span className="text-primary">يكتب...</span>
            ) : (
              `@${otherUser.username}`
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">ابدأ المحادثة الآن!</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أرسل رسالتك الأولى</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId === myUid;
            const parts = parseMessageContent(msg.content);
            const showDateSeparator =
              idx === 0 ||
              new Date(messages[idx - 1].timestamp).toDateString() !==
                new Date(msg.timestamp).toDateString();

            return (
              <div key={msg.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-2">
                    <span className="text-xs text-muted-foreground/60 bg-muted px-3 py-1 rounded-full">
                      {new Date(msg.timestamp).toLocaleDateString('ar', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-bl-md'
                        : 'bg-muted rounded-br-md'
                    }`}
                  >
                    {parts.map((part, pIdx) => {
                      if (part.type === 'image') {
                        return (
                          <img
                            key={pIdx}
                            src={`data:image/jpeg;base64,${part.value}`}
                            alt="صورة"
                            className="max-w-full rounded-xl mt-1 max-h-60 object-cover"
                          />
                        );
                      }
                      return (
                        <p key={pIdx} className="text-sm whitespace-pre-wrap break-words">
                          {part.value}
                        </p>
                      );
                    })}
                    <p
                      className={`text-[10px] mt-1 flex items-center gap-1 ${
                        isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                      }`}
                    >
                      {formatMessageTime(msg.timestamp)}
                      {isMine && (
                        msg.isRead
                          ? <span className="text-[10px]">✓✓</span>
                          : <span className="text-[10px]">✓</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-br-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imageBase64 && (
        <div className="border-t border-border/50 px-4 py-2">
          <div className="relative inline-block">
            <img
              src={`data:image/jpeg;base64,${imageBase64}`}
              alt="معاينة"
              className="h-20 w-20 rounded-xl object-cover"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setImageBase64('')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border/50 p-3">
        <form
          className="flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input
            placeholder="اكتب رسالة..."
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="rounded-full h-10 flex-1"
            dir="rtl"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            disabled={(!newMessage.trim() && !imageBase64) || isSending}
          >
            {isSending ? (
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}