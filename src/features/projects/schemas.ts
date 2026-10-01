import { z } from "zod";
import { roleSkillSelectionIsValid, roleHasValidCapacity } from "@/features/projects/domain";

const roleSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1600),
  slotCount: z.number().int().min(1).max(20),
  requiredSkillIds: z.array(z.uuid()).max(20),
  preferredSkillIds: z.array(z.uuid()).max(20),
}).superRefine((role, ctx) => {
  if (!roleHasValidCapacity(role)) ctx.addIssue({ code: "custom", path: ["slotCount"], message: "Jumlah slot harus lebih dari nol." });
  if (!roleSkillSelectionIsValid(role)) ctx.addIssue({ code: "custom", message: "Skill tidak boleh duplikat atau sekaligus wajib dan pilihan." });
});

export const projectDraftSchema = z.object({
  title: z.string().trim().min(5).max(120),
  problemStatement: z.string().trim().min(30).max(4000),
  objective: z.string().trim().min(20).max(2400),
  scope: z.string().trim().min(20).max(6000),
  expectedDeliverables: z.string().trim().min(20).max(4000),
  categoryId: z.uuid(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  paymentType: z.enum(["PAID", "UNPAID"]),
  proposedCompensationAmount: z.number().positive().max(999999999999.99).nullable(),
  estimatedDurationDays: z.number().int().min(1).max(365).nullable(),
  roles: z.array(roleSchema).max(12),
}).superRefine((project, ctx) => {
  if (project.paymentType === "UNPAID" && project.proposedCompensationAmount !== null) {
    ctx.addIssue({ code: "custom", path: ["proposedCompensationAmount"], message: "Project unpaid tidak menerima angka kompensasi." });
  }
});

export const projectModerationSchema = z.object({
  projectId: z.uuid(),
  decision: z.enum(["APPROVED", "REQUEST_REVISION", "REJECTED"]),
  reason: z.string().trim().max(1600).optional().default(""),
});
