'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SquarePen, Search, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ref, onValue, off, get, set, push, query, orderByChild } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { ConversationData, UserData, ChatMessage } from '@/lib/types';
import { VerificationBadge } from '@/components/layout/verification-badge';

const tabs = [
  { key: 'all', label: 'الكل' },
  { key: 'unread', label: 'غير المقروءة' },
  { key: 'groups', label: 'المجموعات' },
] as const;
type TabKey = (typeof tabs)[number]['key'];

interface ConversationWithUser {
  id: string;
  data: ConversationData;
  otherUser: UserData | null;
  unread: number;
}

function AvatarCircle({ base64, name, isOnline, className }: { base64: string; name: string; isOnline?: boolean; className?: string }) {
  return (
    <div className={cn('relative shrink-0', className)}>
      {base64 ? (
        <img src={`data:image/jpeg;base64,${base64}`} alt={name} className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
          {name?.charAt(0) || 'م'}
        </div>
      )}
      {isOnline && (
        <span className="absolute bottom-0 left-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
      )}
    </div>
  );
}

export function MessagesView() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { navigate, setSelectedConversation } = useAppStore();

  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [creatingConv, setCreatingConv] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, UserData>>({});

  // Fetch user data with caching
  const fetchUser = useCallback(async (userId: string): Promise<UserData | null> => {
    if (userCache[userId]) return userCache[userId];
    try {
      const snap = await get(ref(db, `users/${userId}`));
      if (snap.exists()) {
        const data = snap.val() as UserData;
        setUserCache((prev) => ({ ...prev, [userId]: data }));
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, [userCache]);

  // Listen to conversations
  useEffect(() => {
    if (!uid) return;
    const convRef = ref(db, 'conversations');
    const unsub = onValue(convRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setConversations([]);
        setLoading(false);
        return;
      }
      const raw = snapshot.val();
      const entries: ConversationWithUser[] = [];

      for (const [id, val] of Object.entries(raw)) {
        const conv = val as ConversationData;
        if (conv.participants && conv.participants.includes(uid)) {
          const otherId = conv.participants.find((p: string) => p !== uid);
          let otherUser: UserData | null = null;
          if (otherId) {
            otherUser = await fetchUser(otherId);
          }
          // Count unread
          let unread = 0;
          try {
            const msgsSnap = await get(query(ref(db, `messages/${id}`), orderByChild('isRead'), equalTo(false)));
            if (msgsSnap.exists()) {
              const msgs = msgsSnap.val();
              for (const msg of Object.values(msgs) as ChatMessage[]) {
                if (msg.recipientId === uid && !msg.isRead) unread++;
              }
            }
          } catch { /* ignore */ }

          entries.push({ id, data: conv, otherUser, unread });
        }
      }
      entries.sort((a, b) => (b.data.lastMessageTimestamp || 0) - (a.data.lastMessageTimestamp || 0));
      setConversations(entries);
      setLoading(false);
    });
    return () => off(convRef);
  }, [uid, fetchUser]);

  // Filter conversations
  const filtered = useMemo(() => {
    let list = conversations;
    if (activeTab === 'unread') list = list.filter((c) => c.unread > 0);
    if (activeTab === 'groups') list = list.filter((c) => c.data.participants && c.data.participants.length > 2);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => c.otherUser?.fullName?.toLowerCase().includes(q) || c.otherUser?.username?.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, activeTab, searchQuery]);

  // Search users for new conversation
  const handleSearchUsers = useCallback(async () => {
    if (!userSearch.trim()) return;
    setSearchingUsers(true);
    try {
      const snap = await get(ref(db, 'users'));
      if (snap.exists()) {
        const all: UserData[] = [];
        const raw = snap.val();
        const q = userSearch.trim().toLowerCase();
        for (const data of Object.values(raw) as UserData[]) {
          if (data.username?.toLowerCase().includes(q) || data.fullName?.toLowerCase().includes(q)) {
            if (data.username !== user?.displayName) all.push(data);
          }
        }
        setSearchResults(all.slice(0, 10));
      }
    } catch { /* ignore */ }
    setSearchingUsers(false);
  }, [userSearch, uid]);

  // Create conversation and navigate
  const handleSelectUser = useCallback(async (selectedUser: UserData) => {
    if (!uid) return;
    setCreatingConv(true);
    try {
      const convId = `${uid < selectedUser.username ? uid : selectedUser.username}_${uid < selectedUser.username ? selectedUser.username : uid}`;
      // Check if conversation exists
      const snap = await get(ref(db, `conversations/${convId}`));
      if (!snap.exists()) {
        await set(ref(db, `conversations/${convId}`), {
          participants: [uid, selectedUser.username],
          lastMessage: '',
          lastMessageTimestamp: Date.now(),
          lastMessageSenderId: '',
          unreadCount: 0,
        });
      }
      setSelectedConversation(convId, selectedUser);
      setComposeOpen(false);
      setUserSearch('');
      setSearchResults([]);
      navigate('chat');
    } catch {
      // fallback: use username as id reference
    }
    setCreatingConv(false);
  }, [uid, setSelectedConversation, navigate]);

  const handleConversationClick = useCallback((conv: ConversationWithUser) => {
    if (conv.otherUser) {
      setSelectedConversation(conv.id, conv.otherUser);
      navigate('chat');
    }
  }, [setSelectedConversation, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">الرسائل</h1>
          <Button variant="ghost" size="icon" onClick={() => setComposeOpen(true)}>
            <SquarePen className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في المحادثات"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 px-4 pt-3 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="relative pb-3 text-sm font-medium transition-colors"
          >
            <span className={cn(activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground')}>
              {tab.label}
            </span>
            {activeTab === tab.key && (
              <motion.div
                layoutId="msg-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div>
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">لا توجد محادثات</p>
            <p className="text-sm mt-1">ابدأ محادثة جديدة</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleConversationClick(conv)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border/30"
              >
                <AvatarCircle
                  base64={conv.otherUser?.avatarBase64 || ''}
                  name={conv.otherUser?.fullName || 'م'}
                  isOnline={conv.otherUser?.isOnline}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-sm truncate">
                        {conv.otherUser?.fullName || 'مستخدم'}
                      </span>
                      <VerificationBadge type={conv.otherUser?.verificationType} size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeTime(conv.data.lastMessageTimestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm text-muted-foreground truncate">
                      @{conv.otherUser?.username || 'user'}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground/70 truncate mt-0.5">
                    {conv.data.lastMessage
                      ? (conv.data.lastMessage.length > 40 ? conv.data.lastMessage.slice(0, 40) + '...' : conv.data.lastMessage)
                      : 'لا توجد رسائل بعد'}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {conv.unread > 99 ? '99+' : conv.unread}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* New Message Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رسالة جديدة</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مستخدم..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
              className="pr-10"
              dir="rtl"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {searchingUsers && (
              <div className="py-4 text-center text-sm text-muted-foreground">جارٍ البحث...</div>
            )}
            {!searchingUsers && searchResults.length === 0 && userSearch && (
              <div className="py-4 text-center text-sm text-muted-foreground">لم يتم العثور على نتائج</div>
            )}
            {searchResults.map((u) => (
              <button
                key={u.username}
                onClick={() => handleSelectUser(u)}
                disabled={creatingConv}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors text-right"
              >
                <AvatarCircle base64={u.avatarBase64 || ''} name={u.fullName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm truncate">{u.fullName}</span>
                    <VerificationBadge type={u.verificationType} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}