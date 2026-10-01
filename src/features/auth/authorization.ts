import type { UserRole } from "@/features/auth/types";

const DASHBOARD_PATHS: Record<UserRole, string> = {
  STUDENT: "/student",
  BUSINESS: "/business",
  ADMIN: "/admin",
};

export function hasRequiredRole(
  actualRole: UserRole | null | undefined,
  requiredRole: UserRole,
): boolean {
  return actualRole === requiredRole;
}

export function dashboardPathForRole(role: UserRole): string {
  return DASHBOARD_PATHS[role];
}

export function safeInternalPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }

  const base = new URL("https://skillbridge.invalid");

  try {
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base.origin) return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
