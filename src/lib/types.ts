export type VerificationType = 'none' | 'blue' | 'gray' | 'gold';

export interface UserData {
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatarBase64: string;
  bannerBase64: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  verificationType: VerificationType;
  isPrivate: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  lastSeen: number;
  createdAt: number;
  location: string;
  website: string;
  birthDate: string;
}

export interface PostData {
  id: string;
  userId: string;
  content: string;
  imageBase64: string;
  timestamp: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  viewsCount: number;
  bookmarksCount: number;
  isDeleted: boolean;
  isPinned: boolean;
  isQuote: boolean;
  quotePostId: string;
  repostedBy: string;
  originalPostId: string;
}

export interface CommentData {
  id: string;
  postId: string;
  userId: string;
  content: string;
  imageBase64: string;
  timestamp: number;
  likesCount: number;
  parentId: string | null;
  isDeleted: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  imageBase64: string;
  timestamp: number;
  isRead: boolean;
  type: 'text' | 'image' | 'system';
}

export interface ConversationData {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: number;
  lastMessageSenderId: string;
  unreadCount: number;
}

export interface NotificationData {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost' | 'quote' | 'verification';
  actorId: string;
  postId: string;
  commentId: string;
  timestamp: number;
  isRead: boolean;
  message: string;
}

export interface ReportData {
  id: string;
  reporterId: string;
  targetUserId: string;
  targetPostId: string;
  targetCommentId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  timestamp: number;
  resolvedBy: string;
  resolvedAt: number;
}

export interface StoryData {
  id: string;
  userId: string;
  imageBase64: string;
  timestamp: number;
  viewers: Record<string, boolean>;
  expiresAt: number;
}

export interface TrendingTopic {
  hashtag: string;
  count: number;
  category: string;
}

export interface BlockedUser {
  blockedUserId: string;
  timestamp: number;
}

export interface MutedUser {
  mutedUserId: string;
  timestamp: number;
}

export interface UserSettings {
  privateAccount: boolean;
  allowMessages: 'everyone' | 'followers' | 'none';
  allowNotifications: boolean;
  darkMode: boolean;
  language: string;
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
}

export type AppView =
  | 'auth'
  | 'home'
  | 'explore'
  | 'notifications'
  | 'messages'
  | 'chat'
  | 'profile'
  | 'edit-profile'
  | 'post-detail'
  | 'bookmarks'
  | 'settings'
  | 'user-list'
  | 'search-results'
  | 'media-viewer'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-posts'
  | 'admin-comments'
  | 'admin-reports'
  | 'admin-analytics'
  | 'admin-settings'
  | 'admin-system';