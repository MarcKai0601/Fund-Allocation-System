import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProfile } from "./api";

interface AuthState {
    token: string | null;
    user: UserProfile | null;
    isInitializing: boolean;
    setToken: (token: string) => void;
    setUser: (user: UserProfile) => void;
    setInitializing: (status: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isInitializing: true,
            setToken: (token: string) => set({ token }),
            setUser: (user: UserProfile) => set({ user }),
            setInitializing: (status: boolean) => set({ isInitializing: status }),
            logout: () => set({ token: null, user: null }),
        }),
        { name: "auth-store" }
    )
);
