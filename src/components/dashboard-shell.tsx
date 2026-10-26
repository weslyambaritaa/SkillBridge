import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { DashboardNavigation } from "@/components/dashboard-navigation";
import type { Account, UserRole } from "@/features/auth/types";

const roleLabels: Record<UserRole, string> = {
  STUDENT: "Student",
  BUSINESS: "UMKM",
  ADMIN: "Admin",
};

export function DashboardShell({
  account,
  children,
}: {
  account: Account;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="wordmark" href="/">
          SkillBridge
        </Link>
        <div className="header-actions">
          <span className="role-pill">{roleLabels[account.role]}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="dashboard-body">
        <DashboardNavigation role={account.role} />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
