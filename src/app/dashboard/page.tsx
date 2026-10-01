import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/features/auth/data";
import { dashboardPathForRole } from "@/features/auth/authorization";

export const dynamic = "force-dynamic";

export default async function DashboardRouter() {
  const account = await getCurrentAccount();

  if (!account) redirect("/login?next=%2Fdashboard");

  redirect(dashboardPathForRole(account.role));
}
