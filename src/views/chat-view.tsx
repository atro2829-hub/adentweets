'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, Send, Circle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

interface OtherUser {
  id: string;
  username: string;
  fullName: string;
  profileImageUrl: string;
  isOnline?: boolean;
}

export function ChatView() {
  const { viewParams, goBack } = useAppStore();
  const { session } = useAuth();
  const conversationId = viewParams.conversationId;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch messages & conversation info
  useEffect(() => {
    if (!conversationId) return;

    async function fetchChat() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/conversations/${conversationId}?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          setOtherUser(data.otherUser || null);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    fetchChat();
  }, [conversationId]);

  // Socket.io connection
  useEffect(() => {
    if (!conversationId || !session?.user?.id) return;

    const socket = io('/?XTransformPort=3004', {
      query: { userId: session.user.id, conversationId },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-conversation', { conversationId });
    });

    socket.on('new-message', (msg: MessageItem) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('typing', () => setIsTyping(true));
    socket.on('stop-typing', () => setIsTyping(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, session?.user?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator
  const handleInputChange = (val: string) => {
    setNewMessage(val);
    socketRef.current?.emit('typing', { conversationId });
    socketRef.current?.emit('stop-typing', { conversationId });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          recipientId: otherUser?.id,
          content,
        }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      }
    } catch {
      // If API fails, still emit via socket as fallback
      socketRef.current?.emit('send-message', {
        conversationId,
        content,
      });
    } finally {
      setIsSending(false);
    }
  };

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] md:h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>

        {otherUser ? (
          <>
            <Avatar className="h-9 w-9">
              <AvatarImage src={otherUser.profileImageUrl} alt={otherUser.fullName} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {otherUser.fullName?.charAt(0) || otherUser.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{otherUser.fullName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {otherUser.isOnline ? (
                  <>
                    <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                    متصل
                  </>
                ) : (
                  `@${otherUser.username}`
                )}
              </p>
            </div>
          </>
        ) : (
          <Skeleton className="h-9 w-9 rounded-full" />
        )}
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
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === session?.user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? 'bg-primary text-primary-foreground rounded-bl-md'
                      : 'bg-muted rounded-br-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
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

      {/* Input */}
      <div className="border-t border-border/50 p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            placeholder="اكتب رسالة..."
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            className="rounded-full h-10"
            dir="rtl"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            disabled={!newMessage.trim() || isSending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}