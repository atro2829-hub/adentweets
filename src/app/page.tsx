'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { Sidebar, MobileSidebarSheet, MobileSidebarTrigger } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CreatePostDialog } from '@/components/tweets/create-post-dialog';
import { AuthView } from '@/views/auth-view';
import { HomeView } from '@/views/home-view';
import { ExploreView } from '@/views/explore-view';
import { NotificationsView } from '@/views/notifications-view';
import { MessagesView } from '@/views/messages-view';
import { ChatView } from '@/views/chat-view';
import { ProfileView } from '@/views/profile-view';
import { EditProfileView } from '@/views/edit-profile-view';
import { PostDetailView } from '@/views/post-detail-view';
import { BookmarksView } from '@/views/bookmarks-view';
import { SettingsView } from '@/views/settings-view';
import { UserListView } from '@/views/user-list-view';
import { SearchResultsView } from '@/views/search-results-view';
import { AdminLoginView } from '@/views/admin-login-view';
import { AdminDashboardView } from '@/views/admin-dashboard-view';
import { AdminUsersView } from '@/views/admin-users-view';
import { AdminPostsView } from '@/views/admin-posts-view';
import { AdminCommentsView } from '@/views/admin-comments-view';
import { AdminReportsView } from '@/views/admin-reports-view';
import { AdminAnalyticsView } from '@/views/admin-analytics-view';
import type { AppView } from '@/lib/types';

function AppShell() {
  const { user, userData, isLoading } = useAuth();
  const { currentView, navigate, isAdminMode } = useAppStore();

  useEffect(() => {
    if (user && currentView === 'auth') {
      navigate('home');
    }
  }, [user, currentView, navigate]);

  // Admin login accessible without session
  if (currentView === 'admin-login') {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <AdminLoginView />
      </div>
    );
  }

  // Show auth view when not authenticated
  if (!user && !isLoading) {
    return <AuthView />;
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/at-icon.png" alt="AT" className="w-12 h-12 rounded-xl animate-pulse" />
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Admin views
  if (isAdminMode) {
    const renderAdminView = () => {
      switch (currentView as AppView) {
        case 'admin-dashboard': return <AdminDashboardView />;
        case 'admin-users': return <AdminUsersView />;
        case 'admin-posts': return <AdminPostsView />;
        case 'admin-comments': return <AdminCommentsView />;
        case 'admin-reports': return <AdminReportsView />;
        case 'admin-analytics': return <AdminAnalyticsView />;
        default: return <AdminDashboardView />;
      }
    };

    return (
      <div className="min-h-screen bg-background" dir="rtl">
        {renderAdminView()}
      </div>
    );
  }

  // User app
  const renderView = () => {
    switch (currentView as AppView) {
      case 'home': return <HomeView />;
      case 'explore': return <ExploreView />;
      case 'notifications': return <NotificationsView />;
      case 'messages': return <MessagesView />;
      case 'chat': return <ChatView />;
      case 'profile': return <ProfileView />;
      case 'edit-profile': return <EditProfileView />;
      case 'post-detail': return <PostDetailView />;
      case 'bookmarks': return <BookmarksView />;
      case 'settings': return <SettingsView />;
      case 'user-list': return <UserListView />;
      case 'search-results': return <SearchResultsView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      <Sidebar />
      <MobileSidebarSheet />
      <main className="flex-1 min-w-0 max-w-[600px] mx-auto w-full border-x border-border/30 lg:pb-0 pb-20">
        {renderView()}
      </main>
      <div className="hidden xl:block w-80 shrink-0" />
      <BottomNav />
      <CreatePostDialog />
    </div>
  );
}

export default function Home() {
  return <AppShell />;
}