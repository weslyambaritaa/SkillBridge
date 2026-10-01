import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/features/auth/data";

export const dynamic = "force-dynamic";

export default async function BusinessLayout({ children }: { children: ReactNode }) {
  const account = await requireRole("BUSINESS");
  return <DashboardShell account={account}>{children}</DashboardShell>;
}
