'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { Mail } from 'lucide-react';

interface ConversationItem {
  id: string;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  otherUser: {
    id: string;
    username: string;
    fullName: string;
    profileImageUrl: string;
  };
  unreadCount: number;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return `منذ ${Math.floor(diffDay / 7)} أسبوع`;
}

export function MessagesView() {
  const { navigate } = useAppStore();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/conversations?limit=30');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || data || []);
        }
      } catch {
        // empty
      } finally {
        setIsLoading(false);
      }
    }
    fetchConversations();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <h1 className="text-xl font-bold">الرسائل</h1>
      </div>

      {isLoading ? (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b border-border/50">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Mail className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">لا توجد محادثات</h3>
          <p className="text-sm text-muted-foreground">
            ابدأ محادثة جديدة من خلال زيارة ملف شخصي
          </p>
        </div>
      ) : (
        <div>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className="w-full flex gap-3 px-4 py-3 border-b border-border/50 text-right transition-colors hover:bg-accent/50"
              onClick={() => navigate('chat', { conversationId: conv.id })}
            >
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={conv.otherUser.profileImageUrl}
                    alt={conv.otherUser.fullName}
                  />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {conv.otherUser.fullName?.charAt(0) || conv.otherUser.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm truncate">
                    {conv.otherUser.fullName}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeTime(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage?.content || 'لا توجد رسائل بعد'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}