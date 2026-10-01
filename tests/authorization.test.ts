import { describe, expect, it } from "vitest";
import { dashboardPathForRole, hasRequiredRole, safeInternalPath } from "../src/features/auth/authorization";

describe("role authorization helpers", () => {
  it("matches only the required role", () => {
    expect(hasRequiredRole("STUDENT", "STUDENT")).toBe(true);
    expect(hasRequiredRole("BUSINESS", "STUDENT")).toBe(false);
    expect(hasRequiredRole(null, "ADMIN")).toBe(false);
  });

  it("routes each role to its isolated dashboard", () => {
    expect(dashboardPathForRole("STUDENT")).toBe("/student");
    expect(dashboardPathForRole("BUSINESS")).toBe("/business");
    expect(dashboardPathForRole("ADMIN")).toBe("/admin");
  });

  it("rejects external and protocol-relative redirect targets", () => {
    expect(safeInternalPath("https://example.com")).toBe("/dashboard");
    expect(safeInternalPath("//example.com")).toBe("/dashboard");
    expect(safeInternalPath("/\\\\example.com")).toBe("/dashboard");
    expect(safeInternalPath("/student")).toBe("/student");
  });
});
