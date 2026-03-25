import { redirect } from "next/navigation";

export default function LegacyFeishuSettingsPage() {
  redirect("/admin/settings/integrations");
}
