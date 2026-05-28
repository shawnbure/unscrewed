import { create } from "zustand";
import { api } from "./api.js";

interface SessionInfo {
  authenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
}

interface State {
  session: SessionInfo | null;
  refresh: () => Promise<void>;
}

export const useSession = create<State>((set) => ({
  session: null,
  refresh: async () => {
    try {
      const s = await api<SessionInfo>("/auth/session");
      set({ session: s });
    } catch {
      set({ session: { authenticated: false } });
    }
  },
}));
