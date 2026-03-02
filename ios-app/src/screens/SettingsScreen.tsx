import React, { useEffect, useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
    Modal, Alert, ActivityIndicator,
} from "react-native";
import { portfoliosApi, devApi, getErrorMsg, PortfolioInfo } from "../lib/api";
import { useAuthStore } from "../lib/auth-store";
import { usePortfolioStore } from "../lib/portfolio-store";

const COLORS = {
    bg: "#0f172a", card: "#1e293b", text: "#f1f5f9", sub: "#94a3b8",
    accent: "#6366f1", border: "#334155", selected: "#312e81",
};

export default function SettingsScreen() {
    const token = useAuthStore((s) => s.token);
    const setToken = useAuthStore((s) => s.setToken);
    const { portfolios, activePortfolioId, setPortfolios, setActive } = usePortfolioStore();
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(false);

    // Dev auto-login
    useEffect(() => {
        if (token) return;
        devApi.login().then((res) => {
            setToken(res.data.token);
        }).catch(() => { });
    }, [token]);

    // Fetch portfolios
    useEffect(() => {
        if (!token) return;
        setLoading(true);
        portfoliosApi.list().then((res) => {
            setPortfolios(res.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [token]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await portfoliosApi.create(newName.trim());
            setNewName("");
            setCreateOpen(false);
            const res = await portfoliosApi.list();
            setPortfolios(res.data);
            Alert.alert("成功", "代操帳戶建立成功");
        } catch (e: any) {
            Alert.alert("錯誤", getErrorMsg(e, "建立失敗"));
        } finally {
            setCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>帳戶管理</Text>

            <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setCreateOpen(true)}
            >
                <Text style={styles.createBtnText}>＋ 新增代操帳戶</Text>
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 30 }} />
            ) : (
                <FlatList
                    data={portfolios}
                    keyExtractor={(p) => String(p.id)}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.portfolioItem,
                                item.id === activePortfolioId && { backgroundColor: COLORS.selected, borderColor: COLORS.accent },
                            ]}
                            onPress={() => setActive(item.id)}
                        >
                            <View>
                                <Text style={styles.portfolioName}>{item.name}</Text>
                                <Text style={styles.sub}>
                                    {item.is_initialized ? `可用 $${Number(item.available_funds).toLocaleString()}` : "尚未初始化"}
                                </Text>
                            </View>
                            {item.id === activePortfolioId && (
                                <View style={styles.activeBadge}>
                                    <Text style={styles.activeBadgeText}>使用中</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <Text style={[styles.sub, { textAlign: "center", marginTop: 30 }]}>尚無代操帳戶</Text>
                    }
                />
            )}

            {/* Create Modal */}
            <Modal visible={createOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>新增代操帳戶</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="帳戶名稱（例：媽媽退休金）"
                            placeholderTextColor={COLORS.sub}
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={[styles.btn, { flex: 1, backgroundColor: COLORS.border }]}
                                onPress={() => setCreateOpen(false)}
                            >
                                <Text style={styles.btnText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, { flex: 1, backgroundColor: COLORS.accent }]}
                                onPress={handleCreate}
                                disabled={creating}
                            >
                                <Text style={styles.btnText}>{creating ? "建立中..." : "建立"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.footer}>
                <Text style={styles.sub}>Fund Allocation System v4.0.0</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
    title: { color: COLORS.text, fontSize: 24, fontWeight: "bold", marginBottom: 16 },
    createBtn: {
        backgroundColor: COLORS.accent, borderRadius: 12, padding: 16,
        alignItems: "center", marginBottom: 20,
    },
    createBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
    portfolioItem: {
        backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
        marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    portfolioName: { color: COLORS.text, fontSize: 17, fontWeight: "600" },
    sub: { color: COLORS.sub, fontSize: 13, marginTop: 4 },
    activeBadge: {
        backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
    },
    activeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    footer: { paddingVertical: 20, alignItems: "center" },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
    modal: {
        backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, paddingBottom: 40,
    },
    modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: "bold", marginBottom: 20 },
    input: {
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14,
        color: COLORS.text, backgroundColor: COLORS.bg, fontSize: 16, marginBottom: 12,
    },
    modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
    btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: "center" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
