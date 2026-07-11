import { create } from 'zustand';

export type ViewType =
  | 'login'
  | 'signup'
  | 'forgot-password'
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
  | 'search-results';

interface AppStore {
  // Navigation
  currentView: ViewType;
  viewParams: Record<string, string>;
  viewHistory: Array<{ view: ViewType; params: Record<string, string> }>;

  // UI state
  isCreatePostOpen: boolean;
  sidebarOpen: boolean;

  // Navigation actions
  navigate: (view: ViewType, params?: Record<string, string>) => void;
  goBack: () => void;

  // UI actions
  setCreatePostOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentView: 'login',
  viewParams: {},
  viewHistory: [],

  isCreatePostOpen: false,
  sidebarOpen: false,

  navigate: (view, params = {}) => {
    const { currentView, viewParams, viewHistory } = get();
    set({
      viewHistory: [...viewHistory, { view: currentView, params: { ...viewParams } }],
      currentView: view,
      viewParams: params,
    });
  },

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      set({
        viewHistory: viewHistory.slice(0, -1),
        currentView: prev.view,
        viewParams: prev.params,
      });
    } else {
      set({ currentView: 'home', viewParams: {} });
    }
  },

  setCreatePostOpen: (open) => set({ isCreatePostOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));