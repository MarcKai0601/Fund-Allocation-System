"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { rbacApi, portfoliosApi, FasRole, RoleAssignment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Trash2, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface PortfolioOption {
  id: number;
  name: string;
}

export default function RbacPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.fas_roles?.includes("SYSTEM_ADMIN") ?? false;

  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [roles, setRoles] = useState<FasRole[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Grant form state
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [granting, setGranting] = useState(false);

  // Filter
  const [filterUser, setFilterUser] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, rRes, pRes] = await Promise.all([
        rbacApi.listAssignments(),
        rbacApi.listRoles(),
        portfoliosApi.list(),
      ]);
      setAssignments(aRes.data);
      setRoles(rRes.data);
      setPortfolios(pRes.data.map((p) => ({ id: p.id, name: p.name })));
    } catch {
      toast.error("載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    load();
  }, [isAdmin, load, router]);

  const handleGrant = async () => {
    if (!targetUserId.trim() || !selectedRole) {
      toast.error("請填入使用者 ID 並選擇角色");
      return;
    }
    setGranting(true);
    try {
      await rbacApi.grantRole(targetUserId.trim(), {
        role_code: selectedRole,
        portfolio_id: selectedPortfolio ? parseInt(selectedPortfolio) : null,
      });
      toast.success("角色指派成功");
      setTargetUserId("");
      setSelectedRole("");
      setSelectedPortfolio("");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "指派失敗");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (assignment: RoleAssignment) => {
    try {
      await rbacApi.revokeRole(assignment.user_id, assignment.id);
      toast.success("已撤銷角色指派");
      load();
    } catch {
      toast.error("撤銷失敗");
    }
  };

  const filtered = assignments.filter(
    (a) => !filterUser || a.user_id.toLowerCase().includes(filterUser.toLowerCase())
  );

  const roleBadgeColor: Record<string, string> = {
    SYSTEM_ADMIN: "bg-red-500/20 text-red-400 border-red-500/30",
    PORTFOLIO_MANAGER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    TRADER: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    ANALYST: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  if (!isAdmin) return null;

  return (
    <div className="flex-1 p-6 overflow-auto" style={{ color: "var(--body-text)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold">角色權限管理</h1>
          <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            指派或撤銷使用者在 FAS 系統中的角色
          </p>
        </div>
        <button
          onClick={load}
          className="ml-auto p-2 rounded-lg transition-colors"
          style={{ color: "var(--sidebar-text)" }}
          title="重新整理"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Grant Role Form */}
      <div
        className="rounded-xl p-5 mb-6 border"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          指派角色
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "var(--sidebar-text)" }}>
              使用者 ID
            </Label>
            <Input
              placeholder="例：1 或 user_abc"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
                color: "var(--body-text)",
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "var(--sidebar-text)" }}>
              角色
            </Label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
                color: "var(--body-text)",
              }}
            >
              <option value="">選擇角色...</option>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "var(--sidebar-text)" }}>
              Portfolio（空白 = 系統層級）
            </Label>
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
                color: "var(--body-text)",
              }}
            >
              <option value="">— 系統層級 —</option>
              {portfolios.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  #{p.id} {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleGrant}
              disabled={granting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {granting ? "指派中..." : "確認指派"}
            </Button>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: "var(--card-border)" }}>
          <h2 className="font-semibold">目前角色指派</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
            {filtered.length} 筆
          </span>
          <Input
            placeholder="過濾使用者 ID..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="ml-auto w-48 h-8 text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              color: "var(--body-text)",
            }}
          />
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--sidebar-text)" }}>
            載入中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--sidebar-text)" }}>
            尚無角色指派
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  {["使用者 ID", "角色", "Portfolio", "授予者", "建立時間", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: "1px solid var(--card-border)" }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{a.user_id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded border text-xs font-medium ${
                          roleBadgeColor[a.role_code] ?? "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {a.role_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--sidebar-text)" }}>
                      {a.portfolio_id ? `#${a.portfolio_id}` : "系統層級"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--sidebar-text)" }}>
                      {a.granted_by ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--sidebar-text)" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString("zh-TW") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRevoke(a)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
                        style={{ color: "var(--sidebar-text)" }}
                        title="撤銷"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
