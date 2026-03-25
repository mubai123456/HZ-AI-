import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/session";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  return children;
}
