import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PortfolioInfo {
    id: number;
    owner_user_id: string;
    name: string;
    available_funds: number;
    total_invested: number;
    total_deposited: number;
    realized_pnl: number;
    is_initialized: boolean;
}

interface PortfolioState {
    portfolios: PortfolioInfo[];
    activePortfolioId: number | null;
    setPortfolios: (list: PortfolioInfo[]) => void;
    setActive: (id: number) => void;
    reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set, get) => ({
            portfolios: [],
            activePortfolioId: null,
            setPortfolios: (list: PortfolioInfo[]) => {
                const current = get().activePortfolioId;
                const stillExists = list.some((p) => p.id === current);
                set({
                    portfolios: list,
                    activePortfolioId: stillExists ? current : list[0]?.id ?? null,
                });
            },
            setActive: (id: number) => set({ activePortfolioId: id }),
            reset: () => set({ portfolios: [], activePortfolioId: null }),
        }),
        { name: "portfolio-store" }
    )
);
