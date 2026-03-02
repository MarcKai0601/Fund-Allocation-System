import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, RefreshControl, ActivityIndicator, Modal, Alert,
} from "react-native";
import { fundsApi, portfolioApi, fmt, getErrorMsg, PortfolioInfo, FundLedgerEntry } from "../lib/api";
import { usePortfolioStore } from "../lib/portfolio-store";

const COLORS = {
    bg: "#0f172a", card: "#1e293b", text: "#f1f5f9", sub: "#94a3b8",
    green: "#22c55e", red: "#ef4444", accent: "#6366f1", border: "#334155",
    input: "#0f172a",
};

export default function FundsScreen() {
    const activeId = usePortfolioStore((s) => s.activePortfolioId);
    const [portfolio, setPortfolio] = useState<PortfolioInfo | null>(null);
    const [ledger, setLedger] = useState<FundLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<"init" | "deposit">("init");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        if (!activeId) { setLoading(false); return; }
        try {
            const [ledRes, overviewRes] = await Promise.all([
                fundsApi.getLedger(activeId),
                portfolioApi.get(activeId),
            ]);
            setLedger(ledRes.data);
            setPortfolio(overviewRes.data.portfolio);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [activeId]);

    useEffect(() => { setLoading(true); load(); }, [load]);

    const handleSubmit = async () => {
        if (!amount || !activeId) return;
        setSubmitting(true);
        const today = new Date().toISOString().slice(0, 10);
        try {
            const fn = modalType === "init" ? fundsApi.init : fundsApi.deposit;
            const res = await fn(activeId, { amount: Number(amount), note: note || undefined, trade_date: today });
            setPortfolio(res.data);
            setModalVisible(false);
            setAmount("");
            setNote("");
            // Reload ledger
            const ledRes = await fundsApi.getLedger(activeId);
            setLedger(ledRes.data);
            Alert.alert("成功", modalType === "init" ? "初始資金設定成功" : "增資成功");
        } catch (e: any) {
            Alert.alert("錯誤", getErrorMsg(e));
        } finally {
            setSubmitting(false);
        }
    };

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

    const typeLabel: Record<string, string> = { INIT: "初始資金", DEPOSIT: "增資", WITHDRAW: "提款" };

    return (
        <View style={styles.container}>
            <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.accent} />}>
                <Text style={styles.title}>資金管理</Text>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>投入資金</Text>
                        <Text style={styles.statValue}>{fmt.currency(portfolio?.total_deposited)}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>可用資金</Text>
                        <Text style={styles.statValue}>{fmt.currency(portfolio?.available_funds)}</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.btnRow}>
                    {!portfolio?.is_initialized && (
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: COLORS.accent }]}
                            onPress={() => { setModalType("init"); setModalVisible(true); }}
                        >
                            <Text style={styles.btnText}>💰 設定初始資金</Text>
                        </TouchableOpacity>
                    )}
                    {portfolio?.is_initialized && (
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: COLORS.green }]}
                            onPress={() => { setModalType("deposit"); setModalVisible(true); }}
                        >
                            <Text style={styles.btnText}>➕ 增資</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Ledger */}
                <Text style={styles.sectionTitle}>資金異動明細</Text>
                {ledger.length === 0 ? (
                    <View style={styles.card}><Text style={styles.sub}>尚無紀錄</Text></View>
                ) : (
                    ledger.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.ledgerRow}>
                                <View>
                                    <Text style={styles.ledgerType}>{typeLabel[item.type] ?? item.type}</Text>
                                    <Text style={styles.sub}>{fmt.date(item.trade_date)}</Text>
                                </View>
                                <Text style={[styles.ledgerAmount, { color: item.amount >= 0 ? COLORS.green : COLORS.red }]}>
                                    {item.amount >= 0 ? "+" : ""}{fmt.currency(item.amount)}
                                </Text>
                            </View>
                            {item.note && <Text style={[styles.sub, { marginTop: 4 }]}>{item.note}</Text>}
                        </View>
                    ))
                )}
                <View style={{ height: 32 }} />
            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>
                            {modalType === "init" ? "設定初始資金" : "增資"}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="金額"
                            placeholderTextColor={COLORS.sub}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="備註（選填）"
                            placeholderTextColor={COLORS.sub}
                            value={note}
                            onChangeText={setNote}
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={[styles.btn, { flex: 1, backgroundColor: COLORS.border }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.btnText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, { flex: 1, backgroundColor: COLORS.accent }]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                <Text style={styles.btnText}>{submitting ? "處理中..." : "確認"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    btnRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
    btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: "center" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    card: {
        backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
        marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
    },
    sub: { color: COLORS.sub, fontSize: 13 },
    ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    ledgerType: { color: COLORS.text, fontSize: 15, fontWeight: "600" },
    ledgerAmount: { fontSize: 16, fontWeight: "bold" },
    modalOverlay: {
        flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)",
    },
    modal: {
        backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, paddingBottom: 40,
    },
    modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: "bold", marginBottom: 20 },
    input: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14,
        color: COLORS.text, backgroundColor: COLORS.input, fontSize: 16, marginBottom: 12,
    },
    modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
});
