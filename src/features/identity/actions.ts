"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { businessProfileSchema, guardianRequestSchema, studentOnboardingSchema, verificationDecisionSchema } from "@/features/identity/schemas";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function formString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function profileSaveFailure(
  flow: "student" | "business",
  error: { code?: string; message?: string },
): string {
  const message = error.message?.toLowerCase() ?? "";
  let cause = "save";

  if (error.code === "PGRST202" || error.code === "42883" || message.includes("schema cache")) {
    cause = "schema";
  } else if (error.code === "42501" || message.includes("role required") || message.includes("authentication required")) {
    cause = "permission";
  } else if (flow === "student" && (error.code === "23505" || message.includes("academic identity") || message.includes("nim") || message.includes("nisn"))) {
    cause = "identity";
  } else if (flow === "student" && message.includes("institution type mismatch")) {
    cause = "institution";
  } else if (flow === "student" && (message.includes("education data") || message.includes("invalid college") || message.includes("invalid vocational"))) {
    cause = "education";
  } else if (flow === "business" && message.includes("verified business identity fields")) {
    cause = "review";
  }

  const code = error.code && /^[A-Z0-9]{4,12}$/u.test(error.code) ? error.code : "other";
  console.error(JSON.stringify({ event: "profile.save_failed", flow, cause, code }));
  return cause;
}

function validateFileSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (mime === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function validatedUpload(form: FormData): Promise<{ file: File; bytes: Uint8Array; extension: string } | null> {
  const candidate = form.get("evidence");
  if (!(candidate instanceof File) || candidate.size === 0 || candidate.size > MAX_FILE_BYTES) return null;
  const extension = MIME_EXTENSIONS[candidate.type];
  if (!extension) return null;
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  if (!validateFileSignature(bytes, candidate.type)) return null;
  return { file: candidate, bytes, extension };
}

export async function saveStudentOnboarding(form: FormData): Promise<void> {
  await requireRole("STUDENT");
  const type = formString(form, "studentType");
  const parsed = studentOnboardingSchema.safeParse({
    studentType: type, displayName: formString(form, "displayName"), bio: formString(form, "bio"),
    institutionId: formString(form, "institutionId"), studyProgram: formString(form, "studyProgram"),
    semester: formString(form, "semester"), major: formString(form, "major"), grade: formString(form, "grade"),
    identity: formString(form, "identity"), dateOfBirth: formString(form, "dateOfBirth"),
  });
  if (!parsed.success) redirect("/student?error=onboarding");
  const supabase = await createSupabaseServerClient();
  const value = parsed.data;
  const { error } = await supabase.rpc("save_student_onboarding", {
    p_type: value.studentType, p_display_name: value.displayName, p_bio: value.bio || null,
    p_institution_id: value.institutionId,
    p_study_program: value.studentType === "COLLEGE" ? value.studyProgram : null,
    p_semester: value.studentType === "COLLEGE" ? Number(value.semester) : null,
    p_major: value.studentType === "VOCATIONAL_SCHOOL" ? value.major : null,
    p_grade: value.studentType === "VOCATIONAL_SCHOOL" ? Number(value.grade) : null,
    p_identity_type: value.studentType === "COLLEGE" ? "NIM" : "NISN",
    p_identity_value: value.identity, p_date_of_birth: value.dateOfBirth,
  });
  if (error) redirect(`/student?error=${profileSaveFailure("student", error)}`);
  redirect("/student?saved=1");
}

export async function submitStudentVerification(form: FormData): Promise<void> {
  await requireRole("STUDENT");
  const upload = await validatedUpload(form);
  if (!upload) redirect("/student?error=file");
  const supabase = await createSupabaseServerClient();
  const { data: attemptId, error: startError } = await supabase.rpc("start_student_verification");
  if (startError || !attemptId) redirect("/student?error=verification");
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) redirect("/login");
  const path = `${userResult.user.id}/student/${attemptId}/${randomUUID()}.${upload.extension}`;
  const { error: storageError } = await supabase.storage.from("verification-evidence").upload(path, upload.bytes, { contentType: upload.file.type, upsert: false });
  if (storageError) redirect("/student?error=upload");
  const { error: evidenceError } = await supabase.rpc("attach_student_evidence", {
    p_attempt_id: attemptId, p_path: path, p_filename: upload.file.name.slice(0, 180), p_mime: upload.file.type, p_size: upload.file.size,
  });
  if (evidenceError) {
    await supabase.storage.from("verification-evidence").remove([path]);
    redirect("/student?error=upload");
  }
  const { error: submitError } = await supabase.rpc("submit_student_verification", { p_attempt_id: attemptId });
  if (submitError) redirect("/student?error=verification");
  redirect("/student?submitted=1");
}

export async function saveBusinessProfile(form: FormData): Promise<void> {
  await requireRole("BUSINESS");
  const parsed = businessProfileSchema.safeParse({
    businessName: formString(form, "businessName"), description: formString(form, "description"), category: formString(form, "category"),
    email: formString(form, "email"), phone: formString(form, "phone"), website: formString(form, "website"), socialUrl: formString(form, "socialUrl"), nib: formString(form, "nib"),
  });
  if (!parsed.success) redirect("/business?error=profile");
  const value = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_business_profile", {
    p_name: value.businessName, p_description: value.description || null, p_category: value.category,
    p_email: value.email, p_phone: value.phone, p_website: value.website, p_social_url: value.socialUrl, p_nib: value.nib,
  });
  if (error) redirect(`/business?error=${profileSaveFailure("business", error)}`);
  redirect("/business?saved=1");
}

export async function submitBusinessVerification(form: FormData): Promise<void> {
  await requireRole("BUSINESS");
  const candidate = form.get("evidence");
  let upload: Awaited<ReturnType<typeof validatedUpload>> = null;
  if (candidate instanceof File && candidate.size > 0) {
    upload = await validatedUpload(form);
    if (!upload) redirect("/business?error=file");
  }
  const description = formString(form, "evidenceDescription").trim();
  if (description.length < 5 || description.length > 1200) redirect("/business?error=evidence");
  const supabase = await createSupabaseServerClient();
  const { data: attemptId, error: startError } = await supabase.rpc("start_business_verification", { p_description: description });
  if (startError || !attemptId) redirect("/business?error=verification");
  if (upload) {
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) redirect("/login");
    const path = `${userResult.user.id}/business/${attemptId}/${randomUUID()}.${upload.extension}`;
    const { error: storageError } = await supabase.storage.from("verification-evidence").upload(path, upload.bytes, { contentType: upload.file.type, upsert: false });
    if (storageError) redirect("/business?error=upload");
    const { error: evidenceError } = await supabase.rpc("attach_business_evidence", {
      p_attempt_id: attemptId, p_path: path, p_filename: upload.file.name.slice(0, 180), p_mime: upload.file.type, p_size: upload.file.size,
    });
    if (evidenceError) {
      await supabase.storage.from("verification-evidence").remove([path]);
      redirect("/business?error=upload");
    }
  }
  const { error: submitError } = await supabase.rpc("submit_business_verification", { p_attempt_id: attemptId });
  if (submitError) redirect("/business?error=verification");
  redirect("/business?submitted=1");
}

export async function requestGuardianConsent(form: FormData): Promise<void> {
  await requireRole("STUDENT");
  const parsed = guardianRequestSchema.safeParse({ guardianName: formString(form,"guardianName"), relationship: formString(form,"relationship"), contact: formString(form,"contact"), policyVersion: formString(form,"policyVersion") });
  if (!parsed.success) redirect("/student?error=guardian");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_guardian_consent", {
    p_name: parsed.data.guardianName, p_relationship: parsed.data.relationship, p_contact: parsed.data.contact, p_policy_version: parsed.data.policyVersion,
  });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result?.raw_token) redirect("/student?error=guardian");
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const cookieStore = await cookies();
  cookieStore.set("skillbridge_guardian_link", `${origin}/guardian-consent#${result.raw_token}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/student", maxAge: 600 });
  redirect("/student?guardianLink=ready");
}

export async function getGuardianConsentNotice(token: string): Promise<{ valid: boolean; studentDisplayName?: string; policyVersion?: string; expiresAt?: string }> {
  if (!/^[a-f0-9]{64}$/u.test(token)) return { valid: false };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_guardian_consent_notice", { p_token: token });
  const notice = data as { valid?: boolean; student_display_name?: string; policy_version?: string; expires_at?: string } | null;
  if (error || !notice?.valid) return { valid: false };
  return { valid: true, studentDisplayName: notice.student_display_name, policyVersion: notice.policy_version, expiresAt: notice.expires_at };
}

export async function confirmGuardianConsentToken(token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/u.test(token)) redirect("/guardian-consent/complete?result=invalid");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("confirm_guardian_consent", { p_token: token });
  redirect(`/guardian-consent/complete?result=${!error && data ? "accepted" : "invalid"}`);
}

export async function decideStudentVerification(form: FormData): Promise<void> {
  await requireRole("ADMIN");
  const parsed = verificationDecisionSchema.safeParse({ attemptId: formString(form,"attemptId"), decision: formString(form,"decision"), reason: formString(form,"reason") });
  if (!parsed.success || !["VERIFIED", "REJECTED"].includes(parsed.data.decision) || (parsed.data.decision === "REJECTED" && parsed.data.reason.length < 3)) redirect("/admin?error=decision");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_decide_student_verification", { p_attempt_id: parsed.data.attemptId, p_decision: parsed.data.decision, p_reason: parsed.data.reason || null });
  if (error) redirect("/admin?error=decision");
  redirect("/admin?updated=1");
}

export async function decideBusinessVerification(form: FormData): Promise<void> {
  await requireRole("ADMIN");
  const parsed = verificationDecisionSchema.safeParse({ attemptId: formString(form,"attemptId"), decision: formString(form,"decision"), reason: formString(form,"reason") });
  if (!parsed.success || (parsed.data.decision === "VERIFIED" && parsed.data.reason.length > 1200) || (parsed.data.decision !== "VERIFIED" && parsed.data.reason.length < 3)) redirect("/admin?error=decision");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_decide_business_verification", { p_attempt_id: parsed.data.attemptId, p_decision: parsed.data.decision, p_reason: parsed.data.reason || null });
  if (error) redirect("/admin?error=decision");
  redirect("/admin?updated=1");
}

export async function createInstitution(form: FormData): Promise<void> {
  await requireRole("ADMIN");
  const type = formString(form,"type");
  const name = formString(form,"name").trim();
  const city = formString(form,"city").trim();
  const province = formString(form,"province").trim();
  if (!(type === "UNIVERSITY" || type === "VOCATIONAL_SCHOOL") || name.length < 2 || name.length > 180) redirect("/admin?error=institution");
  const normalizedName = name.normalize("NFKC").trim().replace(/\s+/gu," ").toLocaleLowerCase("id-ID");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("institutions").insert({ type, name, normalized_name: normalizedName, city_regency: city || null, province: province || null });
  if (error) redirect("/admin?error=institution");
  redirect("/admin?institution=created");
}
