import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, RefreshControl,
    ActivityIndicator,
} from "react-native";
import { tradesApi, fmt, Transaction } from "../lib/api";
import { usePortfolioStore } from "../lib/portfolio-store";

const COLORS = {
    bg: "#0f172a", card: "#1e293b", text: "#f1f5f9", sub: "#94a3b8",
    green: "#22c55e", red: "#ef4444", accent: "#6366f1", border: "#334155",
    buyBg: "rgba(99,102,241,0.15)", sellBg: "rgba(239,68,68,0.15)",
};

export default function TradesScreen() {
    const activeId = usePortfolioStore((s) => s.activePortfolioId);
    const [trades, setTrades] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!activeId) { setLoading(false); return; }
        try {
            const res = await tradesApi.list(activeId);
            setTrades(res.data);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [activeId]);

    useEffect(() => { setLoading(true); load(); }, [load]);

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

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.accent} />}
        >
            <Text style={styles.title}>交易紀錄</Text>

            {trades.length === 0 ? (
                <View style={styles.card}>
                    <Text style={styles.sub}>尚無交易紀錄</Text>
                </View>
            ) : (
                trades.map((tx) => {
                    const isBuy = tx.action === "BUY";
                    return (
                        <View
                            key={tx.id}
                            style={[styles.card, { backgroundColor: isBuy ? COLORS.buyBg : COLORS.sellBg }]}
                        >
                            <View style={styles.txHeader}>
                                <View style={styles.txLeft}>
                                    <View style={[styles.badge, { backgroundColor: isBuy ? COLORS.accent : COLORS.red }]}>
                                        <Text style={styles.badgeText}>{isBuy ? "買入" : "賣出"}</Text>
                                    </View>
                                    <Text style={styles.txSymbol}>{tx.symbol}</Text>
                                </View>
                                <Text style={styles.txDate}>{fmt.date(tx.trade_date)}</Text>
                            </View>

                            <View style={styles.txDetail}>
                                <DetailItem label="成交價" value={fmt.currency(tx.price)} />
                                <DetailItem label="股數" value={`${tx.quantity}`} />
                                <DetailItem label="手續費" value={fmt.currency(tx.fee)} />
                                <DetailItem label="總金額" value={fmt.currency(tx.total_amount)} />
                            </View>

                            {tx.action === "SELL" && tx.pnl != null && (
                                <View style={styles.pnlRow}>
                                    <Text style={[styles.pnlValue, { color: tx.pnl >= 0 ? COLORS.green : COLORS.red }]}>
                                        損益: {fmt.currency(tx.pnl)} ({fmt.pct(tx.pnl_pct)})
                                    </Text>
                                </View>
                            )}

                            {tx.note && (
                                <Text style={[styles.sub, { marginTop: 6 }]}>📝 {tx.note}</Text>
                            )}
                        </View>
                    );
                })
            )}
            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailItem}>
            <Text style={styles.sub}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
    center: { justifyContent: "center", alignItems: "center" },
    emptyText: { color: COLORS.sub, fontSize: 18 },
    title: { color: COLORS.text, fontSize: 24, fontWeight: "bold", marginBottom: 16 },
    card: {
        backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
    },
    sub: { color: COLORS.sub, fontSize: 13 },
    txHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    txLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    txSymbol: { color: COLORS.text, fontSize: 17, fontWeight: "bold" },
    txDate: { color: COLORS.sub, fontSize: 13 },
    txDetail: { flexDirection: "row", justifyContent: "space-between" },
    detailItem: { alignItems: "center" },
    detailValue: { color: COLORS.text, fontSize: 14, fontWeight: "600", marginTop: 2 },
    pnlRow: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
    pnlValue: { fontSize: 15, fontWeight: "bold" },
});
