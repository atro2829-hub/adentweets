'use client';

import { create } from 'zustand';
import type {
  AppView,
  UserData,
  PostData,
  ChatMessage,
  AppNotification,
  ConversationData,
} from '@/lib/types';

interface AppState {
  // Navigation
  currentView: AppView;
  previousView: AppView | null;
  navigate: (view: AppView) => void;
  goBack: () => void;

  // Auth
  currentUser: UserData | null;
  currentUserId: string | null;
  setCurrentUser: (user: UserData | null, uid: string | null) => void;

  // View params
  viewParams: Record<string, string>;
  setViewParams: (params: Record<string, string>) => void;

  // Post detail
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;

  // Chat
  selectedConversationId: string | null;
  selectedConversationUser: UserData | null;
  setSelectedConversation: (id: string, user: UserData) => void;

  // User list
  userListType: 'followers' | 'following' | null;
  userListUserId: string | null;
  setUserList: (type: 'followers' | 'following', userId: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  setNotifications: (notifications: AppNotification[]) => void;
  setUnreadCount: (count: number) => void;

  // Admin
  isAdminMode: boolean;
  setAdminMode: (mode: boolean) => void;

  // Compose
  isComposeOpen: boolean;
  setComposeOpen: (open: boolean) => void;
  replyToPostId: string | null;
  setReplyToPostId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'auth',
  previousView: null,
  navigate: (view) =>
    set((state) => ({
      previousView: state.currentView,
      currentView: view,
    })),
  goBack: () =>
    set((state) => ({
      currentView: state.previousView || 'home',
      previousView: null,
    })),

  // Auth
  currentUser: null,
  currentUserId: null,
  setCurrentUser: (user, uid) => set({ currentUser: user, currentUserId: uid }),

  // View params
  viewParams: {},
  setViewParams: (params) => set({ viewParams: params }),

  // Post detail
  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),

  // Chat
  selectedConversationId: null,
  selectedConversationUser: null,
  setSelectedConversation: (id, user) =>
    set({ selectedConversationId: id, selectedConversationUser: user }),

  // User list
  userListType: null,
  userListUserId: null,
  setUserList: (type, userId) =>
    set({ userListType: type, userListUserId: userId }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Notifications
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  // Admin
  isAdminMode: false,
  setAdminMode: (mode) => set({ isAdminMode: mode }),

  // Compose
  isComposeOpen: false,
  setComposeOpen: (open) => set({ isComposeOpen: open }),
  replyToPostId: null,
  setReplyToPostId: (id) => set({ replyToPostId: id }),
}));