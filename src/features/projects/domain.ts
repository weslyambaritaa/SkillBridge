import type { UserRole } from "@/features/auth/types";

export type ProjectModerationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";
export type ProjectLifecycleStatus = "NOT_STARTED" | "CANCELLED";
export type ProjectVisibility = "PRIVATE" | "PUBLIC";

export type RoleDraft = {
  title: string;
  description: string;
  slotCount: number;
  requiredSkillIds: string[];
  preferredSkillIds: string[];
};

export type ProjectDraft = {
  title: string;
  problemStatement: string;
  objective: string;
  scope: string;
  expectedDeliverables: string;
  categoryId: string;
  roles: RoleDraft[];
};

export function canCreateProject(role: UserRole | null, businessVerified: boolean): boolean {
  return role === "BUSINESS" && businessVerified;
}

export function roleHasValidCapacity(role: RoleDraft): boolean {
  return Number.isInteger(role.slotCount) && role.slotCount > 0 && role.slotCount <= 20;
}

export function roleSkillSelectionIsValid(role: RoleDraft): boolean {
  const required = new Set(role.requiredSkillIds);
  const preferred = new Set(role.preferredSkillIds);
  return required.size === role.requiredSkillIds.length
    && preferred.size === role.preferredSkillIds.length
    && [...required].every((id) => !preferred.has(id));
}

export function projectIsReadyForSubmission(project: ProjectDraft, businessVerified: boolean): boolean {
  return canCreateProject("BUSINESS", businessVerified)
    && project.title.trim().length >= 5
    && project.problemStatement.trim().length >= 30
    && project.objective.trim().length >= 20
    && project.scope.trim().length >= 20
    && project.expectedDeliverables.trim().length >= 20
    && project.categoryId.length > 0
    && project.roles.length > 0
    && project.roles.every((role) => role.title.trim().length >= 2
      && role.description.trim().length >= 10
      && roleHasValidCapacity(role)
      && role.requiredSkillIds.length > 0
      && roleSkillSelectionIsValid(role));
}

export function projectIsPublic(input: {
  moderationStatus: ProjectModerationStatus;
  lifecycleStatus: ProjectLifecycleStatus;
  visibility: ProjectVisibility;
  publishedAt: string | null;
  businessVerified: boolean;
}): boolean {
  return input.moderationStatus === "APPROVED"
    && input.lifecycleStatus === "NOT_STARTED"
    && input.visibility === "PUBLIC"
    && input.publishedAt !== null
    && input.businessVerified;
}

export function requiresModerationAfterEdit(status: ProjectModerationStatus, moderatedFieldsChanged: boolean): boolean {
  return status === "APPROVED" && moderatedFieldsChanged;
}

export function moderationStateAfterEdit(status: ProjectModerationStatus, moderatedFieldsChanged: boolean, publishedAt: string | null): {
  moderationStatus: ProjectModerationStatus;
  visibility: ProjectVisibility;
  publishedAt: string | null;
} {
  if (!requiresModerationAfterEdit(status, moderatedFieldsChanged)) {
    return { moderationStatus: status, visibility: status === "APPROVED" && publishedAt ? "PUBLIC" : "PRIVATE", publishedAt: status === "APPROVED" ? publishedAt : null };
  }
  return { moderationStatus: "DRAFT", visibility: "PRIVATE", publishedAt: null };
}

export function cancelledProjectState<T>(history: T[]): {
  lifecycleStatus: ProjectLifecycleStatus;
  visibility: ProjectVisibility;
  history: T[];
} {
  return { lifecycleStatus: "CANCELLED", visibility: "PRIVATE", history: [...history] };
}

export function mayModerateProject(role: UserRole | null): boolean {
  return role === "ADMIN";
}

export function toPublicBusinessProjection(input: {
  businessName: string;
  description: string | null;
  verified: boolean;
  businessEmail?: string | null;
  businessPhone?: string | null;
  nib?: string | null;
}) {
  return {
    businessName: input.businessName,
    description: input.description?.slice(0, 500) ?? "",
    verified: input.verified,
  };
}
