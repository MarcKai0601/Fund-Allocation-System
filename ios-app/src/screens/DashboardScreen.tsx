import React, { useEffect, useState } from "react";
import {
    View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { portfolioApi, fmt, PortfolioOverview, Position } from "../lib/api";
import { usePortfolioStore } from "../lib/portfolio-store";

const COLORS = {
    bg: "#0f172a",
    card: "#1e293b",
    text: "#f1f5f9",
    sub: "#94a3b8",
    green: "#22c55e",
    red: "#ef4444",
    accent: "#6366f1",
    border: "#334155",
};

export default function DashboardScreen() {
    const activeId = usePortfolioStore((s) => s.activePortfolioId);
    const [data, setData] = useState<PortfolioOverview | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        if (!activeId) { setLoading(false); return; }
        try {
            const res = await portfolioApi.get(activeId);
            setData(res.data);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => { setLoading(true); load(); }, [activeId]);

    if (!activeId) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.emptyText}>請先選擇代操帳戶</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    const pf = data?.portfolio;
    const positions = data?.positions ?? [];

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.accent} />}
        >
            <Text style={styles.title}>{pf?.name ?? "總覽"}</Text>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <StatCard label="投入資金" value={fmt.currency(pf?.total_deposited)} />
                <StatCard label="可用資金" value={fmt.currency(pf?.available_funds)} />
            </View>
            <View style={styles.statsRow}>
                <StatCard
                    label="未實現損益"
                    value={fmt.currency(data?.total_unrealized_pnl)}
                    color={
                        (data?.total_unrealized_pnl ?? 0) >= 0 ? COLORS.green : COLORS.red
                    }
                />
                <StatCard
                    label="已實現損益"
                    value={fmt.currency(pf?.realized_pnl)}
                    color={(pf?.realized_pnl ?? 0) >= 0 ? COLORS.green : COLORS.red}
                />
            </View>

            {/* Positions */}
            <Text style={styles.sectionTitle}>持股庫存</Text>
            {positions.length === 0 ? (
                <View style={styles.card}>
                    <Text style={styles.sub}>尚無持股</Text>
                </View>
            ) : (
                positions.map((pos) => <PositionCard key={pos.symbol} pos={pos} />)
            )}
            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
        </View>
    );
}

function PositionCard({ pos }: { pos: Position }) {
    const pnlColor = (pos.unrealized_pnl ?? 0) >= 0 ? COLORS.green : COLORS.red;
    return (
        <View style={styles.card}>
            <View style={styles.posHeader}>
                <View>
                    <Text style={styles.posSymbol}>{pos.symbol}</Text>
                    <Text style={styles.sub}>{pos.name ?? ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.posValue, { color: pnlColor }]}>
                        {fmt.currency(pos.unrealized_pnl)}
                    </Text>
                    <Text style={[styles.sub, { color: pnlColor }]}>
                        {fmt.pct(pos.unrealized_pnl_pct)}
                    </Text>
                </View>
            </View>
            <View style={styles.posDetail}>
                <Text style={styles.sub}>持有 {pos.quantity} 股</Text>
                <Text style={styles.sub}>均價 {fmt.currency(pos.avg_cost)}</Text>
                <Text style={styles.sub}>現價 {fmt.currency(pos.current_price)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
    center: { justifyContent: "center", alignItems: "center" },
    emptyText: { color: COLORS.sub, fontSize: 18 },
    title: { color: COLORS.text, fontSize: 24, fontWeight: "bold", marginBottom: 16 },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "600", marginTop: 24, marginBottom: 12 },
    statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    statCard: {
        flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: COLORS.border,
    },
    statLabel: { color: COLORS.sub, fontSize: 13, marginBottom: 4 },
    statValue: { color: COLORS.text, fontSize: 20, fontWeight: "bold" },
    card: {
        backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
        marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
    },
    sub: { color: COLORS.sub, fontSize: 13 },
    posHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    posSymbol: { color: COLORS.text, fontSize: 16, fontWeight: "bold" },
    posValue: { fontSize: 16, fontWeight: "bold" },
    posDetail: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
});
