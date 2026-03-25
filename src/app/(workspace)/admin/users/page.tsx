import { AdminUsersClient } from "@/components/admin-users-client";
import { PageTemplate } from "@/components/page-template";
import { getUsers } from "@/lib/db/users";
import { getCurrentSession } from "@/lib/session";

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([getUsers(), getCurrentSession()]);

  if (!session || session.role !== "ADMIN") {
    return <div className="flex items-center justify-center py-24 text-slate-400">无访问权限</div>;
  }

  return (
    <PageTemplate
      eyebrow="权限与账号"
      title="用户管理"
      description="统一管理账号、角色、启用状态与每日额度，让用户管理页回到标准后台列表结构。"
    >
      <AdminUsersClient initialUsers={users} currentUserId={session.sub} embedded />
    </PageTemplate>
  );
}
