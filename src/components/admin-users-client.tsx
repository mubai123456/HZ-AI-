"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminBulkToolbar } from "@/components/admin-bulk-toolbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useListSelection } from "@/components/use-list-selection";
import type { BulkOperationResult, UserBulkAction, UserRecord, UserRole } from "@/lib/types";

type SortField = "username" | "displayName" | "role" | "status" | "dailyClaimLimit" | "lastLoginAt";
type SortDirection = "asc" | "desc";

function parseInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function upsertUser(list: UserRecord[], nextUser: UserRecord) {
  const index = list.findIndex((item) => item.id === nextUser.id);
  if (index === -1) {
    return [nextUser, ...list];
  }

  return list.map((item) => (item.id === nextUser.id ? nextUser : item));
}

function buildSortValue(user: UserRecord, field: SortField) {
  switch (field) {
    case "displayName":
      return user.displayName;
    case "role":
      return user.role;
    case "status":
      return user.active ? "ACTIVE" : "DISABLED";
    case "dailyClaimLimit":
      return user.dailyClaimLimit;
    case "lastLoginAt":
      return user.lastLoginAt;
    case "username":
    default:
      return user.username;
  }
}

function sortUsers(items: UserRecord[], field: SortField, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = buildSortValue(left, field);
    const rightValue = buildSortValue(right, field);

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor;
    }

    return String(leftValue).localeCompare(String(rightValue), "zh-CN") * factor;
  });
}

async function readResponseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function SortButton({
  label,
  field,
  activeField,
  direction,
  onToggle,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
  onToggle: (field: SortField) => void;
}) {
  const active = activeField === field;

  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={`inline-flex items-center gap-1 transition ${active ? "text-slate-700" : "text-slate-400 hover:text-slate-600"}`}
    >
      {label}
      <span className="text-[10px]">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

export function AdminUsersClient({
  initialUsers,
  currentUserId,
  embedded = false,
}: {
  initialUsers: UserRecord[];
  currentUserId: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [sortField, setSortField] = useState<SortField>("lastLoginAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [creating, setCreating] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<UserRecord | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);
  const [bulkRoleInput, setBulkRoleInput] = useState<UserRole>("USER");
  const [bulkLimitDialogOpen, setBulkLimitDialogOpen] = useState(false);
  const [bulkDailyLimitInput, setBulkDailyLimitInput] = useState("3");
  const [drafts, setDrafts] = useState<Record<string, { displayName: string; role: UserRole; dailyClaimLimit: string }>>(
    Object.fromEntries(
      initialUsers.map((item) => [
        item.id,
        {
          displayName: item.displayName,
          role: item.role,
          dailyClaimLimit: String(item.dailyClaimLimit),
        },
      ]),
    ),
  );
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "USER" as UserRole,
    dailyClaimLimit: "3",
  });

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const next = users.filter((user) => {
      const matchesQuery =
        keyword.length === 0 ||
        user.username.toLowerCase().includes(keyword) ||
        user.displayName.toLowerCase().includes(keyword);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.active) ||
        (statusFilter === "DISABLED" && !user.active);

      return matchesQuery && matchesRole && matchesStatus;
    });

    return sortUsers(next, sortField, sortDirection);
  }, [query, roleFilter, sortDirection, sortField, statusFilter, users]);

  const selection = useListSelection(users);
  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((item) => selection.selectedIdSet.has(item.id));

  function setRowDraft(userId: string, patch: Partial<{ displayName: string; role: UserRole; dailyClaimLimit: string }>) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        displayName: current[userId]?.displayName ?? "",
        role: current[userId]?.role ?? "USER",
        dailyClaimLimit: current[userId]?.dailyClaimLimit ?? "3",
        ...patch,
      },
    }));
  }

  function syncDraft(user: UserRecord) {
    setRowDraft(user.id, {
      displayName: user.displayName,
      role: user.role,
      dailyClaimLimit: String(user.dailyClaimLimit),
    });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "lastLoginAt" ? "desc" : "asc");
  }

  async function saveRow(user: UserRecord, patch?: Partial<{ displayName: string; role: UserRole; active: boolean; dailyClaimLimit: number }>) {
    const draft = drafts[user.id];
    const nextDailyClaimLimit = patch?.dailyClaimLimit ?? parseInteger(draft?.dailyClaimLimit ?? String(user.dailyClaimLimit));

    if (!Number.isInteger(nextDailyClaimLimit) || nextDailyClaimLimit < 0 || nextDailyClaimLimit > 100) {
      setMessage("每日额度必须是 0 到 100 的整数。");
      syncDraft(user);
      return;
    }

    setPendingAction(user.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          displayName: patch?.displayName ?? draft?.displayName ?? user.displayName,
          role: patch?.role ?? draft?.role ?? user.role,
          active: patch?.active ?? user.active,
          dailyClaimLimit: nextDailyClaimLimit,
        }),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "保存用户失败。");
        syncDraft(user);
        return;
      }

      setUsers((current) => upsertUser(current, data.item));
      syncDraft(data.item);
      setMessage("用户信息已更新。");

      if (user.id === currentUserId) {
        router.refresh();
      }
    } catch {
      setMessage("保存用户失败。");
      syncDraft(user);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreateUser() {
    const username = form.username.trim();
    const password = form.password.trim();
    const dailyClaimLimit = parseInteger(form.dailyClaimLimit);

    if (!username) {
      setMessage("请输入用户名。");
      return;
    }

    if (password.length < 6) {
      setMessage("初始密码至少需要 6 位。");
      return;
    }

    if (!Number.isInteger(dailyClaimLimit) || dailyClaimLimit < 0 || dailyClaimLimit > 100) {
      setMessage("每日额度必须是 0 到 100 的整数。");
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName: form.displayName.trim(),
          password,
          role: form.role,
          dailyClaimLimit,
        }),
      });

      const data = await readResponseJson(response);
      if (!response.ok) {
        setMessage(data.error ?? "创建用户失败。");
        return;
      }

      setUsers((current) => upsertUser(current, data.item));
      syncDraft(data.item);
      setForm({
        username: "",
        displayName: "",
        password: "",
        role: "USER",
        dailyClaimLimit: "3",
      });
      setMessage("用户已创建。");
    } catch {
      setMessage("创建用户失败。");
    } finally {
      setCreating(false);
    }
  }

  async function handlePasswordReset(user: UserRecord) {
    if (passwordInput.trim().length < 6) {
      setMessage("新密码至少需要 6 位。");
      return;
    }

    setPendingAction(`${user.id}:password`);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "修改密码失败。");
        return;
      }

      setPasswordTarget(null);
      setPasswordInput("");
      setMessage(`已更新 ${user.username} 的密码。`);
    } catch {
      setMessage("修改密码失败。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBulkAction(action: UserBulkAction) {
    if (selection.selectedIds.length === 0) {
      setMessage("请先勾选要处理的用户。");
      return;
    }

    setPendingAction(action.type);
    setMessage(null);

    try {
      const response = await fetch("/api/internal/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selection.selectedIds, action }),
      });
      const data = (await readResponseJson(response)) as BulkOperationResult & { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "批量操作失败。");
        return;
      }

      if (action.type === "delete") {
        setUsers((current) => current.filter((item) => !selection.selectedIdSet.has(item.id)));
      } else {
        setUsers((current) =>
          current.map((item) => {
            if (!selection.selectedIdSet.has(item.id)) {
              return item;
            }

            if (action.type === "setActive") {
              return { ...item, active: action.active };
            }

            if (action.type === "setRole") {
              return { ...item, role: action.role };
            }

            if (action.type === "setDailyClaimLimit") {
              return { ...item, dailyClaimLimit: action.dailyClaimLimit };
            }

            return item;
          }),
        );
      }

      selection.clearSelection();
      setMessage(
        `批量操作完成：成功 ${data.summary.successCount} 条，跳过 ${data.summary.skippedCount} 条，失败 ${data.summary.failureCount} 条。`,
      );
    } catch {
      setMessage("批量操作失败。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteUser(user: UserRecord) {
    setPendingAction(user.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        setMessage(data.error ?? "删除用户失败。");
        return;
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
      selection.clearSelection();
      setDeleteTarget(null);
      setMessage(data.mode === "archived" ? "用户已归档停用。" : "用户已删除。");
    } catch {
      setMessage("删除用户失败。");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            {embedded ? "用户创建" : "Admin / Users"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            {embedded ? "新增用户" : "用户与额度管理"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            支持列表内直接调整显示名、角色、状态和每日额度，不再需要进入详情页。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="用户名" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
          <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="显示名" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
          <input value={form.password} type="password" onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="初始密码" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <input value={form.dailyClaimLimit} onChange={(event) => setForm({ ...form, dailyClaimLimit: event.target.value })} placeholder="每日额度" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleCreateUser} disabled={creating} className="rounded-full bg-[#0066DD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0055BB] disabled:bg-slate-300">
            {creating ? "创建中..." : "创建用户"}
          </button>
          <p className="text-xs text-slate-400">用户名会自动转成小写，密码会以哈希形式保存。</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_180px_180px]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">搜索用户</label>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100" placeholder="用户名 / 显示名" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">角色</label>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "ALL" | UserRole)} className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]">
              <option value="ALL">全部角色</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">状态</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "DISABLED")} className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD]">
              <option value="ALL">全部状态</option>
              <option value="ACTIVE">已启用</option>
              <option value="DISABLED">已停用</option>
            </select>
          </div>
        </div>
      </section>

      <AdminBulkToolbar selectedCount={selection.selectedCount} label="已选用户" onToggleSelectAll={() => selection.toggleSelectAll(filteredUsers)}>
        <button type="button" onClick={() => void handleBulkAction({ type: "setActive", active: true })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量启用</button>
        <button type="button" onClick={() => void handleBulkAction({ type: "setActive", active: false })} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量停用</button>
        <button type="button" onClick={() => { setBulkRoleInput("USER"); setBulkRoleDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改角色</button>
        <button type="button" onClick={() => { setBulkDailyLimitInput("3"); setBulkLimitDialogOpen(true); }} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">批量改额度</button>
        <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={selection.selectedCount === 0 || pendingAction !== null} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50">批量删除/归档</button>
      </AdminBulkToolbar>

      <section className="rounded-[24px] border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100">
              <tr className="text-slate-400">
                <th className="px-4 py-4 font-medium">
                  <input type="checkbox" checked={allFilteredSelected} onChange={() => selection.toggleSelectAll(filteredUsers)} aria-label="全选当前筛选用户" />
                </th>
                <th className="px-6 py-4 font-medium"><SortButton label="用户名" field="username" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-4 py-4 font-medium"><SortButton label="显示名" field="displayName" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-4 py-4 font-medium"><SortButton label="角色" field="role" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-4 py-4 font-medium"><SortButton label="状态" field="status" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-4 py-4 font-medium"><SortButton label="每日额度" field="dailyClaimLimit" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-4 py-4 font-medium"><SortButton label="最后登录" field="lastLoginAt" activeField={sortField} direction={sortDirection} onToggle={toggleSort} /></th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const isWorking = pendingAction === user.id;
                const draft = drafts[user.id] ?? {
                  displayName: user.displayName,
                  role: user.role,
                  dailyClaimLimit: String(user.dailyClaimLimit),
                };

                return (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selection.selectedIdSet.has(user.id)} disabled={isCurrentUser} onChange={() => selection.toggleSelected(user.id)} aria-label={`勾选用户 ${user.username}`} />
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-950">{user.username}</td>
                    <td className="px-4 py-4">
                      <input
                        value={draft.displayName}
                        onChange={(event) => setRowDraft(user.id, { displayName: event.target.value })}
                        onBlur={() => void saveRow(user)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={draft.role}
                        disabled={isCurrentUser}
                        onChange={(event) => {
                          const role = event.target.value as UserRole;
                          setRowDraft(user.id, { role });
                          void saveRow(user, { role });
                        }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={user.active}
                          disabled={isCurrentUser}
                          onChange={(event) => void saveRow(user, { active: event.target.checked })}
                        />
                        {user.active ? "ACTIVE" : "DISABLED"}
                      </label>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={draft.dailyClaimLimit}
                        onChange={(event) => setRowDraft(user.id, { dailyClaimLimit: event.target.value })}
                        onBlur={() => void saveRow(user)}
                        className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="px-4 py-4 text-slate-500">{user.lastLoginAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setPasswordTarget(user); setPasswordInput(""); }} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">改密码</button>
                        {!isCurrentUser ? (
                          <button type="button" onClick={() => setDeleteTarget(user)} disabled={isWorking} className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">删除</button>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400">当前账号</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">当前筛选条件下没有用户</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除用户"
        description={
          deleteTarget ? (
            <>
              <p>确定要删除用户 {deleteTarget.username} 吗？</p>
              <p className="mt-2 text-xs text-slate-500">如果用户已有历史数据，系统会自动归档停用，而不是直接清空所有痕迹。</p>
            </>
          ) : null
        }
        confirmLabel="确认删除"
        confirmTone="danger"
        pending={deleteTarget ? pendingAction === deleteTarget.id : false}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDeleteUser(deleteTarget);
          }
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="批量删除或归档用户"
        description={`确定要处理当前选中的 ${selection.selectedCount} 个用户吗？有历史数据的用户会自动归档停用。`}
        confirmLabel="确认处理"
        confirmTone="danger"
        pending={pendingAction === "delete"}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          setBulkDeleteOpen(false);
          void handleBulkAction({ type: "delete" });
        }}
      />

      <FormDialog
        open={passwordTarget !== null}
        title="重置用户密码"
        description={passwordTarget ? `为用户 ${passwordTarget.username} 设置新密码。` : null}
        confirmLabel="更新密码"
        pending={passwordTarget ? pendingAction === `${passwordTarget.id}:password` : false}
        confirmDisabled={passwordInput.trim().length < 6}
        onClose={() => {
          setPasswordTarget(null);
          setPasswordInput("");
        }}
        onSubmit={() => {
          if (passwordTarget) {
            void handlePasswordReset(passwordTarget);
          }
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">新密码</span>
          <input
            type="password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
            placeholder="至少 6 位"
          />
        </label>
      </FormDialog>

      <FormDialog
        open={bulkRoleDialogOpen}
        title="批量修改用户角色"
        description={`为当前选中的 ${selection.selectedCount} 个用户统一设置角色。`}
        confirmLabel="应用角色"
        pending={pendingAction === "setRole"}
        onClose={() => setBulkRoleDialogOpen(false)}
        onSubmit={() => {
          setBulkRoleDialogOpen(false);
          void handleBulkAction({ type: "setRole", role: bulkRoleInput });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">目标角色</span>
          <select
            value={bulkRoleInput}
            onChange={(event) => setBulkRoleInput(event.target.value as UserRole)}
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
      </FormDialog>

      <FormDialog
        open={bulkLimitDialogOpen}
        title="批量修改每日额度"
        description={`为当前选中的 ${selection.selectedCount} 个用户统一设置每日额度。`}
        confirmLabel="应用额度"
        pending={pendingAction === "setDailyClaimLimit"}
        confirmDisabled={!Number.isInteger(parseInteger(bulkDailyLimitInput))}
        onClose={() => setBulkLimitDialogOpen(false)}
        onSubmit={() => {
          const dailyClaimLimit = parseInteger(bulkDailyLimitInput);
          if (!Number.isInteger(dailyClaimLimit) || dailyClaimLimit < 0 || dailyClaimLimit > 100) {
            setMessage("每日额度必须是 0 到 100 的整数。");
            return;
          }

          setBulkLimitDialogOpen(false);
          void handleBulkAction({ type: "setDailyClaimLimit", dailyClaimLimit });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">每日额度</span>
          <input
            type="number"
            value={bulkDailyLimitInput}
            onChange={(event) => setBulkDailyLimitInput(event.target.value)}
            className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0066DD] focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </FormDialog>
    </div>
  );
}
