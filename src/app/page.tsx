'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore, ViewType } from '@/store/app-store';
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar';
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

function AppShell() {
  const { session, isLoading, refresh } = useAuth();
  const { currentView, navigate } = useAppStore();

  // Reset view to home when session is detected
  useEffect(() => {
    if (session && (currentView === 'login' || currentView === 'signup' || currentView === 'forgot-password')) {
      navigate('home');
    }
  }, [session, currentView, navigate]);

  // Fetch session on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Show auth view when not authenticated
  if (!session && !isLoading) {
    return <AuthView />;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth-related views still shown even when session is valid (e.g., during re-login)
  if (
    currentView === 'login' ||
    currentView === 'signup' ||
    currentView === 'forgot-password'
  ) {
    return <AuthView />;
  }

  const renderView = () => {
    switch (currentView as ViewType) {
      case 'home':
        return <HomeView />;
      case 'explore':
        return <ExploreView />;
      case 'notifications':
        return <NotificationsView />;
      case 'messages':
        return <MessagesView />;
      case 'chat':
        return <ChatView />;
      case 'profile':
        return <ProfileView />;
      case 'edit-profile':
        return <EditProfileView />;
      case 'post-detail':
        return <PostDetailView />;
      case 'bookmarks':
        return <BookmarksView />;
      case 'settings':
        return <SettingsView />;
      case 'user-list':
        return <UserListView />;
      case 'search-results':
        return <SearchResultsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Trigger */}
      <MobileSidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 max-w-[600px] mx-auto w-full border-x border-border/30 md:pb-0 pb-16">
        {renderView()}
      </main>

      {/* Right sidebar placeholder for larger screens */}
      <div className="hidden xl:block w-80 shrink-0" />

      {/* Bottom Navigation (mobile) */}
      <BottomNav />

      {/* Create Post Dialog */}
      <CreatePostDialog />
    </div>
  );
}

export default function Home() {
  return <AppShell />;
}