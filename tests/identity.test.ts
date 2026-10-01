import { describe, expect, it } from "vitest";
import { businessEligibleForProject, guardianTokenFromFragment, isGuardianTokenValid, isValidAcademicIdentity, nextVerificationAttempt, normalizeAcademicIdentity, studentEligibleForApply } from "../src/features/identity/domain";

describe("academic identity", () => {
  it("normalizes NIM with Unicode NFKC, whitespace removal, and uppercase", () => {
    expect(normalizeAcademicIdentity("NIM", "  ２０２４ / ab  ")).toBe("2024/AB");
    expect(isValidAcademicIdentity("NIM", "24-001/A")).toBe(true);
  });

  it("normalizes NISN and validates its ten digit national format", () => {
    expect(normalizeAcademicIdentity("NISN", "12345-67890")).toBe("1234567890");
    expect(isValidAcademicIdentity("NISN", "12345-67890")).toBe(true);
    expect(isValidAcademicIdentity("NISN", "123456789")).toBe(false);
  });

  it("models NIM uniqueness within an institution and NISN uniqueness nationally", () => {
    const nimKey = (institution: string, value: string) => `${institution}:NIM:${normalizeAcademicIdentity("NIM", value)}`;
    const nisnKey = (value: string) => `NISN:${normalizeAcademicIdentity("NISN", value)}`;
    expect(nimKey("univ-a", "001")).not.toBe(nimKey("univ-b", "001"));
    expect(nisnKey("1234567890")).toBe(nisnKey("12345-67890"));
  });
});

describe("verification policy", () => {
  it("preserves an append-only attempt sequence", () => {
    const previous = [1, 2, 3];
    expect(nextVerificationAttempt(previous)).toBe(4);
    expect(previous).toEqual([1, 2, 3]);
  });

  it("only verified students qualify, with consent required for minors", () => {
    expect(studentEligibleForApply("PENDING", false, null)).toBe(false);
    expect(studentEligibleForApply("VERIFIED", false, null)).toBe(true);
    expect(studentEligibleForApply("VERIFIED", true, "PENDING")).toBe(false);
    expect(studentEligibleForApply("VERIFIED", true, "CONSENTED")).toBe(true);
  });

  it("requires businesses to be verified", () => {
    expect(businessEligibleForProject("REQUEST_REVISION")).toBe(false);
    expect(businessEligibleForProject("VERIFIED")).toBe(true);
  });

  it("checks guardian token expiry", () => {
    expect(isGuardianTokenValid("2030-01-01T00:00:00.000Z", Date.parse("2029-12-31T00:00:00.000Z"))).toBe(true);
    expect(isGuardianTokenValid("2020-01-01T00:00:00.000Z", Date.parse("2021-01-01T00:00:00.000Z"))).toBe(false);
    expect(isGuardianTokenValid("bad-date")).toBe(false);
  });

  it("accepts a well-formed fragment token and rejects malformed values without echoing them", () => {
    const secret = "a".repeat(64);
    expect(guardianTokenFromFragment(`#${secret}`)).toBe(secret);
    expect(guardianTokenFromFragment("#short-token")).toBeNull();
  });
});
