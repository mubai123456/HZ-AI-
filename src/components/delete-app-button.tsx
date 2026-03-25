"use client";

import { useState } from "react";

interface Props {
  code: string;
  name: string;
}

export function DeleteAppButton({ code, name }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`确定要删除应用“${name}”吗？会连同任务和同步记录一起删除，且无法恢复。`)) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/internal/admin/apps/${encodeURIComponent(code)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.reload();
        return;
      }

      alert("删除失败");
      setDeleting(false);
    } catch {
      alert("删除失败");
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60"
    >
      {deleting ? "删除中..." : "删除"}
    </button>
  );
}
