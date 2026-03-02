import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PortfolioInfo } from "./api";

interface PortfolioState {
    portfolios: PortfolioInfo[];
    activePortfolioId: number | null;
    setPortfolios: (list: PortfolioInfo[]) => void;
    setActive: (id: number) => void;
    reset: () => void;
    hydrate: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
    portfolios: [],
    activePortfolioId: null,
    setPortfolios: (list: PortfolioInfo[]) => {
        set((s) => {
            const active = s.activePortfolioId && list.find((p) => p.id === s.activePortfolioId)
                ? s.activePortfolioId
                : list[0]?.id ?? null;
            if (active) AsyncStorage.setItem("active-portfolio-id", String(active));
            return { portfolios: list, activePortfolioId: active };
        });
    },
    setActive: (id: number) => {
        AsyncStorage.setItem("active-portfolio-id", String(id));
        set({ activePortfolioId: id });
    },
    reset: () => {
        AsyncStorage.removeItem("active-portfolio-id");
        set({ portfolios: [], activePortfolioId: null });
    },
    hydrate: async () => {
        const saved = await AsyncStorage.getItem("active-portfolio-id");
        if (saved) set({ activePortfolioId: Number(saved) });
    },
}));
