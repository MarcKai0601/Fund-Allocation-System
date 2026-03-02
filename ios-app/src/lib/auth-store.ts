import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthState {
    token: string | null;
    setToken: (token: string) => void;
    logout: () => void;
    hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    setToken: (token: string) => {
        AsyncStorage.setItem("auth-token", token);
        set({ token });
    },
    logout: () => {
        AsyncStorage.removeItem("auth-token");
        set({ token: null });
    },
    hydrate: async () => {
        const token = await AsyncStorage.getItem("auth-token");
        if (token) set({ token });
    },
}));
