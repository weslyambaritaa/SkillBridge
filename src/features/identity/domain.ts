export type AcademicIdentityType = "NIM" | "NISN";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export function normalizeAcademicIdentity(
  type: AcademicIdentityType,
  value: string,
): string {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, "").toUpperCase();
  return type === "NISN" ? normalized.replace(/[-‐‑‒–—]/gu, "") : normalized;
}

export function isValidAcademicIdentity(type: AcademicIdentityType, value: string): boolean {
  const normalized = normalizeAcademicIdentity(type, value);
  if (type === "NISN") return /^[0-9]{10}$/u.test(normalized);
  return /^[A-Z0-9][A-Z0-9/._-]{1,63}$/u.test(normalized);
}

export function nextVerificationAttempt(previousAttempts: number[]): number {
  return Math.max(0, ...previousAttempts) + 1;
}

export function studentEligibleForApply(
  verification: VerificationStatus,
  isMinor: boolean,
  guardianConsent: "PENDING" | "CONSENTED" | "REVOKED" | "EXPIRED" | null,
): boolean {
  return verification === "VERIFIED" && (!isMinor || guardianConsent === "CONSENTED");
}

export function businessEligibleForProject(status: string): boolean {
  return status === "VERIFIED";
}

export function isGuardianTokenValid(expiresAt: string, now = Date.now()): boolean {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}

export function guardianTokenFromFragment(fragment: string): string | null {
  const candidate = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  return /^[a-f0-9]{64}$/u.test(candidate) ? candidate : null;
}
