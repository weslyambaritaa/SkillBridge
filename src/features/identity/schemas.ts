import { z } from "zod";
import { isValidAcademicIdentity } from "@/features/identity/domain";

const optionalUrl = z.union([z.literal(""), z.string().url().max(2048)]).transform((value) => value || null);
const email = z.union([z.literal(""), z.email().max(254)]).transform((value) => value || null);

export const studentOnboardingSchema = z.object({
  studentType: z.enum(["COLLEGE", "VOCATIONAL_SCHOOL"]),
  displayName: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(1200).optional().default(""),
  institutionId: z.uuid(),
  studyProgram: z.string().trim().max(160).optional().default(""),
  semester: z.string().optional().default(""),
  major: z.string().trim().max(160).optional().default(""),
  grade: z.string().optional().default(""),
  identity: z.string().trim().min(3).max(64),
  dateOfBirth: z.iso.date(),
}).superRefine((value, ctx) => {
  const identityType = value.studentType === "COLLEGE" ? "NIM" : "NISN";
  if (!isValidAcademicIdentity(identityType, value.identity)) {
    ctx.addIssue({ code: "custom", path: ["identity"], message: "Format identitas akademik tidak valid." });
  }
  if (value.studentType === "COLLEGE") {
    if (!value.studyProgram || !/^(?:[1-9]|1[0-6])$/u.test(value.semester) || value.major || value.grade) {
      ctx.addIssue({ code: "custom", message: "Lengkapi program studi dan semester." });
    }
  } else if (!value.major || !/^1[0-2]$/u.test(value.grade) || value.studyProgram || value.semester) {
    ctx.addIssue({ code: "custom", message: "Lengkapi jurusan dan kelas 10 sampai 12." });
  }
});

export const businessProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  category: z.string().trim().min(2).max(100),
  email,
  phone: z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/u)]).transform((value) => value || null),
  website: optionalUrl,
  socialUrl: optionalUrl,
  nib: z.union([z.literal(""), z.string().trim().min(5).max(32)]).transform((value) => value || null),
});

export const guardianRequestSchema = z.object({
  guardianName: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(3).max(254).refine((value) => z.regexes.email.test(value) || /^\+?[0-9 ()-]{8,24}$/u.test(value), "Masukkan email atau nomor telepon yang valid."),
  policyVersion: z.literal("guardian-consent-v1"),
});

export const verificationDecisionSchema = z.object({
  attemptId: z.uuid(),
  decision: z.enum(["VERIFIED", "REJECTED", "REQUEST_REVISION"]),
  reason: z.string().trim().max(1200).optional().default(""),
});
