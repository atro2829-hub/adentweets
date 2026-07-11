'use client';

import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { UserData } from '@/lib/types';
import { Mail, Search, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

interface ConversationData {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: number;
  lastMessageSenderId: string;
}

interface ConversationWithUser extends ConversationData {
  otherUser: UserData | null;
  unreadCount: number;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffMonth < 12) return `منذ ${Math.floor(diffDay / 7)} أسبوع`;
  return `منذ ${diffMonth} شهر`;
}

export function MessagesView() {
  const { user } = useAuth();
  const { setSelectedConversation, navigate, currentUserId } = useAppStore();
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [userCache, setUserCache] = useState<Record<string, UserData>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const myUid = user?.uid || currentUserId;

  // Listen to all conversations
  useEffect(() => {
    if (!myUid) return;
    setIsLoading(true);

    const conversationsRef = ref(db, 'conversations');
    const unsubscribe = onValue(conversationsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const data = snapshot.val();
      const convList: ConversationData[] = [];

      for (const [convId, convData] of Object.entries(data as Record<string, Record<string, unknown>>)) {
        const participants = convData.participants;
        // participants could be an array or object { uid: true }
        let participantIds: string[] = [];
        if (Array.isArray(participants)) {
          participantIds = participants;
        } else if (typeof participants === 'object' && participants !== null) {
          participantIds = Object.keys(participants);
        }

        // Only include conversations where current user is a participant
        if (participantIds.includes(myUid)) {
          const otherUserId = participantIds.find((id: string) => id !== myUid);
          if (otherUserId) {
            convList.push({
              id: convId,
              participants: participantIds,
              lastMessage: (convData.lastMessage as string) || '',
              lastMessageTimestamp: (convData.lastMessageTimestamp as number) || 0,
              lastMessageSenderId: (convData.lastMessageSenderId as string) || '',
            });
          }
        }
      }

      // Sort by last message timestamp (newest first)
      convList.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

      // Fetch user data for other participants that we don't have cached
      const otherUserIds = convList.map((c) => c.participants.find((id) => id !== myUid)!).filter(Boolean);
      const uniqueUserIds = [...new Set(otherUserIds.filter((id) => !userCache[id]))];

      const newUserCache = { ...userCache };

      if (uniqueUserIds.length > 0) {
        const userPromises = uniqueUserIds.map(async (uid) => {
          const userRef = ref(db, `users/${uid}`);
          const userSnap = await get(userRef);
          if (userSnap.exists()) {
            newUserCache[uid] = { username: '', email: '', fullName: '', bio: '', avatarBase64: '', bannerBase64: '', followersCount: 0, followingCount: 0, postsCount: 0, isVerified: false, isPrivate: false, isSuspended: false, isAdmin: false, createdAt: 0, ...userSnap.val() };
          }
        });
        await Promise.all(userPromises);
        setUserCache(newUserCache);
      }

      // Count unread messages for each conversation
      const unreadPromises = convList.map(async (conv) => {
        try {
          const messagesRef = ref(db, `messages/${conv.id}`);
          const msgSnap = await get(messagesRef);
          let count = 0;
          if (msgSnap.exists()) {
            const msgs = msgSnap.val() as Record<string, { senderId: string; isRead: boolean }>;
            for (const msg of Object.values(msgs)) {
              if (msg.senderId !== myUid && !msg.isRead) {
                count++;
              }
            }
          }
          return { ...conv, otherUser: newUserCache[conv.participants.find((id) => id !== myUid)!] || null, unreadCount: count };
        } catch {
          return { ...conv, otherUser: newUserCache[conv.participants.find((id) => id !== myUid)!] || null, unreadCount: 0 };
        }
      });

      const convsWithData = await Promise.all(unreadPromises);
      setConversations(convsWithData);
      setIsLoading(false);
    }, (error) => {
      console.error('Firebase conversations listener error:', error);
      toast.error('حدث خطأ في تحميل المحادثات');
      setIsLoading(false);
    });

    return () => off(conversationsRef);
  }, [myUid]);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.otherUser?.fullName?.toLowerCase().includes(q) ||
        conv.otherUser?.username?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const handleNewMessage = () => {
    toast.info('انتقل إلى ملف شخصي لبدء محادثة');
    navigate('explore');
  };

  const handleConversationClick = (conv: ConversationWithUser) => {
    const otherUserId = conv.participants.find((id) => id !== myUid);
    if (otherUserId && conv.otherUser) {
      setSelectedConversation(conv.id, conv.otherUser);
      navigate('chat');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">الرسائل</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleNewMessage}
          >
            <Edit3 className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في المحادثات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full h-9 pr-9 text-sm"
            dir="rtl"
          />
        </div>
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
      ) : filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Mail className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold mb-1">
            {searchQuery ? 'لا توجد نتائج' : 'لا توجد محادثات'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'جرّب البحث باسم مختلف'
              : 'ابدأ محادثة جديدة من خلال زيارة ملف شخصي'}
          </p>
        </div>
      ) : (
        <div>
          {filteredConversations.map((conv) => {
            const avatarSrc = conv.otherUser?.avatarBase64
              ? `data:image/jpeg;base64,${conv.otherUser.avatarBase64}`
              : '';
            const displayName = conv.otherUser?.fullName || conv.otherUser?.username || 'مستخدم';
            const initial = displayName.charAt(0);

            return (
              <button
                key={conv.id}
                className="w-full flex gap-3 px-4 py-3 border-b border-border/50 text-right transition-colors hover:bg-accent/50"
                onClick={() => handleConversationClick(conv)}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm truncate">{displayName}</span>
                    {conv.lastMessageTimestamp > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(conv.lastMessageTimestamp)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage || 'لا توجد رسائل بعد'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}