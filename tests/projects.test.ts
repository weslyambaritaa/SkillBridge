import { describe, expect, it } from "vitest";
import { canCreateProject, cancelledProjectState, mayModerateProject, moderationStateAfterEdit, projectIsPublic, projectIsReadyForSubmission, roleHasValidCapacity, roleSkillSelectionIsValid, toPublicBusinessProjection } from "../src/features/projects/domain";

const readyProject = {
  title: "Improve customer order tracking",
  problemStatement: "Customers currently cannot follow their submitted orders and frequently contact the shop for updates.",
  objective: "Provide clear and timely order progress for customers and shop staff.",
  scope: "Build a responsive status page and a simple staff workflow for updating order progress.",
  expectedDeliverables: "Working responsive web application, source code, deployment notes, and a short handover guide.",
  categoryId: "category-id",
  roles: [{ title: "Frontend developer", description: "Build the responsive customer order status pages.", slotCount: 2, requiredSkillIds: ["skill-a"], preferredSkillIds: ["skill-b"] }],
};

describe("project eligibility and submission", () => {
  it("allows creation only for a verified business, never a student", () => {
    expect(canCreateProject("BUSINESS", true)).toBe(true);
    expect(canCreateProject("BUSINESS", false)).toBe(false);
    expect(canCreateProject("STUDENT", true)).toBe(false);
    expect(canCreateProject("ADMIN", true)).toBe(false);
  });

  it("requires at least one role and one required skill per role before submission", () => {
    expect(projectIsReadyForSubmission({ ...readyProject, roles: [] }, true)).toBe(false);
    expect(projectIsReadyForSubmission({ ...readyProject, roles: [{ ...readyProject.roles[0], requiredSkillIds: [] }] }, true)).toBe(false);
    expect(projectIsReadyForSubmission(readyProject, false)).toBe(false);
    expect(projectIsReadyForSubmission(readyProject, true)).toBe(true);
  });

  it("requires positive slot count", () => {
    expect(roleHasValidCapacity({ ...readyProject.roles[0], slotCount: 0 })).toBe(false);
    expect(roleHasValidCapacity({ ...readyProject.roles[0], slotCount: 1 })).toBe(true);
  });

  it("prevents duplicate or both-required-and-preferred skills", () => {
    expect(roleSkillSelectionIsValid({ ...readyProject.roles[0], requiredSkillIds: ["a", "a"] })).toBe(false);
    expect(roleSkillSelectionIsValid({ ...readyProject.roles[0], requiredSkillIds: ["a"], preferredSkillIds: ["a"] })).toBe(false);
    expect(roleSkillSelectionIsValid(readyProject.roles[0])).toBe(true);
  });
});

describe("project moderation/publication", () => {
  it("keeps publication criteria independent from project state", () => {
    const approved = { moderationStatus: "APPROVED" as const, lifecycleStatus: "NOT_STARTED" as const, visibility: "PUBLIC" as const, publishedAt: "2026-09-30T00:00:00Z", businessVerified: true };
    expect(projectIsPublic(approved)).toBe(true);
    expect(projectIsPublic({ ...approved, moderationStatus: "REVISION_REQUESTED" })).toBe(false);
    expect(projectIsPublic({ ...approved, lifecycleStatus: "CANCELLED" })).toBe(false);
    expect(projectIsPublic({ ...approved, visibility: "PRIVATE" })).toBe(false);
    expect(projectIsPublic({ ...approved, businessVerified: false })).toBe(false);
  });

  it("revokes approval/publication when approved moderated content changes", () => {
    expect(moderationStateAfterEdit("APPROVED", true, "2026-09-30T00:00:00Z")).toEqual({ moderationStatus: "DRAFT", visibility: "PRIVATE", publishedAt: null });
    expect(moderationStateAfterEdit("APPROVED", false, "2026-09-30T00:00:00Z")).toEqual({ moderationStatus: "APPROVED", visibility: "PUBLIC", publishedAt: "2026-09-30T00:00:00Z" });
  });

  it("cancels without deleting review history", () => {
    const history = [{ attempt: 1, decision: "REQUEST_REVISION" }, { attempt: 2, decision: null }];
    const result = cancelledProjectState(history);
    expect(result.lifecycleStatus).toBe("CANCELLED");
    expect(result.visibility).toBe("PRIVATE");
    expect(result.history).toEqual(history);
    expect(result.history).not.toBe(history);
  });

  it("limits moderation to Admin", () => {
    expect(mayModerateProject("ADMIN")).toBe(true);
    expect(mayModerateProject("BUSINESS")).toBe(false);
    expect(mayModerateProject("STUDENT")).toBe(false);
  });
});

describe("public business projection", () => {
  it("returns no NIB, private email, or phone", () => {
    const projection = toPublicBusinessProjection({ businessName: "Kedai Nusantara", description: "UMKM lokal", verified: true, nib: "PRIVATE-123", businessEmail: "owner@example.com", businessPhone: "+62812345678" });
    expect(projection).toEqual({ businessName: "Kedai Nusantara", description: "UMKM lokal", verified: true });
    expect(JSON.stringify(projection)).not.toContain("PRIVATE-123");
    expect(JSON.stringify(projection)).not.toContain("owner@example.com");
  });
});
