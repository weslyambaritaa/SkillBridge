import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardNavigation } from "@/components/dashboard-navigation";
import { dashboardPathForRole } from "@/features/auth/authorization";
import type { Account } from "@/features/auth/types";

export function PublicShell({ account, section, children }: { account: Account | null; section: "home" | "projects"; children: ReactNode }) {
  return (
    <div className="marketplace-shell">
      <header className="marketplace-header">
        <Link className="wordmark" href="/">SkillBridge</Link>
        <nav className="header-actions" aria-label="Akun">
          {account ? (
            <><span className="role-pill">{account.role === "BUSINESS" ? "UMKM" : account.role === "STUDENT" ? "Student" : "Admin"}</span><Link className="button button-secondary" href={dashboardPathForRole(account.role)}>Dashboard</Link></>
          ) : (
            <><Link className="text-link" href="/login">Masuk</Link><Link className="button button-primary" href="/register">Buat akun</Link></>
          )}
        </nav>
      </header>
      <div className="marketplace-layout">
        {account ? <DashboardNavigation role={account.role} /> : (
          <aside className="dashboard-sidebar marketplace-sidebar">
            <p className="eyebrow">Menu</p>
            <nav aria-label="Navigasi utama">
              <Link className="dashboard-nav-link" href="/" aria-current={section === "home" ? "page" : undefined}>Beranda</Link>
              <Link className="dashboard-nav-link" href="/projects" aria-current={section === "projects" ? "page" : undefined}>Jelajahi project</Link>
              <Link className="dashboard-nav-link" href="/login">Masuk</Link>
            </nav>
          </aside>
        )}
        <main className="marketplace-content">{children}</main>
      </div>
    </div>
  );
}
