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
  isPrivate: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  createdAt: number;
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
  isDeleted: boolean;
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

export interface LikeData {
  [userId: string]: boolean;
}

export interface FollowData {
  [followingId: string]: boolean;
}

export interface MessageData {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

export interface ConversationData {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: number;
  lastMessageSenderId: string;
}

export interface NotificationData {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
  actorId: string;
  postId: string;
  commentId: string;
  timestamp: number;
  isRead: boolean;
}

export interface BookmarkData {
  [postId: string]: boolean;
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
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-posts'
  | 'admin-comments'
  | 'admin-reports'
  | 'admin-analytics'
  | 'admin-settings'
  | 'admin-system';

export interface AppNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
  actorId: string;
  actorName: string;
  actorAvatar: string;
  postId: string;
  timestamp: number;
  isRead: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}