import { create } from "zustand";

interface AppState {
  /** Global loading overlay */
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  /** Sidebar open state (for future use) */
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  /** Theme preference */
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),

  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  theme: "system",
  setTheme: (theme) => set({ theme }),
}));
