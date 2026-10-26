"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/features/auth/types";

const menus: Record<UserRole, { href: string; label: string }[]> = {
  STUDENT: [{ href: "/student", label: "Profil dan verifikasi" }, { href: "/student/applications", label: "Lamaran saya" }],
  BUSINESS: [
    { href: "/business", label: "Profil dan verifikasi usaha" },
    { href: "/business/projects", label: "Proyek saya" },
    { href: "/business/projects/new", label: "Buat proyek" },
  ],
  ADMIN: [
    { href: "/admin", label: "Verifikasi dan institusi" },
    { href: "/admin/project-review", label: "Review proyek" },
  ],
};

export function DashboardNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const links = [...menus[role], { href: "/projects", label: "Jelajahi proyek" }, { href: "/", label: "Beranda" }];
  const activeHref = links.filter(({ href }) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return <aside className="dashboard-sidebar"><p className="eyebrow">Menu</p>
    <nav aria-label="Navigasi dashboard">{links.map(({ href, label }) =>
      <Link key={href} href={href} className="dashboard-nav-link" aria-current={activeHref === href ? "page" : undefined}>{label}</Link>
    )}</nav>
  </aside>;
}
