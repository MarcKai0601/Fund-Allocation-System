import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProfile } from "./api";

interface AuthState {
    token: string | null;
    user: UserProfile | null;
    setToken: (token: string) => void;
    login: (token: string) => void;
    setUser: (user: UserProfile) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            setToken: (token: string) => set({ token }),
            login: (token: string) => set({ token }),
            setUser: (user: UserProfile) => set({ user }),
            logout: () => set({ token: null, user: null }),
        }),
        { name: "auth-store" }
    )
);
