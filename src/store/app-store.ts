'use client';

import { create } from 'zustand';
import type {
  AppView,
  UserData,
  NotificationData,
  StoryData,
  TrendingTopic,
} from '@/lib/types';

interface AppState {
  currentView: AppView;
  previousView: AppView | null;
  navigate: (view: AppView) => void;
  goBack: () => void;

  currentUser: UserData | null;
  currentUserId: string | null;
  setCurrentUser: (user: UserData | null, uid: string | null) => void;

  viewParams: Record<string, string>;
  setViewParams: (params: Record<string, string>) => void;

  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;

  selectedConversationId: string | null;
  selectedConversationUser: UserData | null;
  setSelectedConversation: (id: string, user: UserData) => void;

  userListType: 'followers' | 'following' | 'likes' | 'reposts' | null;
  userListUserId: string | null;
  setUserList: (type: 'followers' | 'following' | 'likes' | 'reposts', userId: string) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  notifications: NotificationData[];
  unreadCount: number;
  setNotifications: (n: NotificationData[]) => void;
  setUnreadCount: (c: number) => void;

  isAdminMode: boolean;
  setAdminMode: (mode: boolean) => void;

  isComposeOpen: boolean;
  setComposeOpen: (open: boolean) => void;
  replyToPostId: string | null;
  setReplyToPostId: (id: string | null) => void;
  quotePostId: string | null;
  setQuotePostId: (id: string | null) => void;

  mediaViewerImages: string[];
  setMediaViewerImages: (images: string[]) => void;
  mediaViewerIndex: number;
  setMediaViewerIndex: (i: number) => void;

  stories: StoryData[];
  setStories: (s: StoryData[]) => void;

  trendingTopics: TrendingTopic[];
  setTrendingTopics: (t: TrendingTopic[]) => void;

  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'auth',
  previousView: null,
  navigate: (view) =>
    set((s) => ({ previousView: s.currentView, currentView: view })),
  goBack: () =>
    set((s) => ({ currentView: s.previousView || 'home', previousView: null })),

  currentUser: null,
  currentUserId: null,
  setCurrentUser: (user, uid) => set({ currentUser: user, currentUserId: uid }),

  viewParams: {},
  setViewParams: (params) => set({ viewParams: params }),

  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),

  selectedConversationId: null,
  selectedConversationUser: null,
  setSelectedConversation: (id, user) =>
    set({ selectedConversationId: id, selectedConversationUser: user }),

  userListType: null,
  userListUserId: null,
  setUserList: (type, userId) =>
    set({ userListType: type, userListUserId: userId }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  isAdminMode: false,
  setAdminMode: (mode) => set({ isAdminMode: mode }),

  isComposeOpen: false,
  setComposeOpen: (open) => set({ isComposeOpen: open }),
  replyToPostId: null,
  setReplyToPostId: (id) => set({ replyToPostId: id }),
  quotePostId: null,
  setQuotePostId: (id) => set({ quotePostId: id }),

  mediaViewerImages: [],
  setMediaViewerImages: (images) => set({ mediaViewerImages: images }),
  mediaViewerIndex: 0,
  setMediaViewerIndex: (i) => set({ mediaViewerIndex: i }),

  stories: [],
  setStories: (s) => set({ stories: s }),
  trendingTopics: [],
  setTrendingTopics: (t) => set({ trendingTopics: t }),

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
}));