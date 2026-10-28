"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validatedCv } from "@/features/applications/cv-validation";

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
function applyError(message: string): string {
  if (message === "Student has already applied to this project") return "duplicate";
  if (message === "Student is already on a project") return "on_project";
  if (message === "Student verification or guardian consent required") return "eligibility";
  if (message === "Project is not open for applications") return "closed";
  return "failed";
}

function logApplicationFailure(event: string, error: { code?: string; status?: number }) {
  const code = error.code && /^[A-Z0-9]{4,12}$/u.test(error.code) ? error.code : "other";
  console.error(JSON.stringify({ event, code, status: error.status ?? null }));
}

export async function applyToProject(form: FormData): Promise<void> {
  await requireRole("STUDENT");
  const slug = field(form, "projectSlug");
  const roleId = field(form, "projectRoleId");
  const message = field(form, "message");
  if (!slugPattern.test(slug) || slug.length > 120) redirect("/projects");
  if (!uuidPattern.test(roleId) || message.length < 20 || message.length > 1000) {
    redirect(`/projects/${slug}?application_error=validation`);
  }
  const cv = await validatedCv(form);
  if (!cv) redirect(`/projects/${slug}?application_error=cv`);
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) redirect("/login");
  const path = `${userResult.user.id}/applications/${randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from("application-cvs").upload(path, cv.bytes, {
    contentType: "application/pdf", upsert: false,
  });
  if (uploadError) {
    logApplicationFailure("application.cv_upload_failed", uploadError);
    redirect(`/projects/${slug}?application_error=upload`);
  }
  const { data, error } = await supabase.rpc("apply_to_project_with_cv", {
    p_project_role_id: roleId, p_message: message, p_cv_path: path,
    p_cv_filename: cv.file.name.slice(0, 180), p_cv_mime: "application/pdf", p_cv_size: cv.file.size,
  });
  if (error || !data) {
    if (error) logApplicationFailure("application.submit_failed", error);
    await supabase.storage.from("application-cvs").remove([path]);
  }
  if (error && applyError(error.message) === "closed") redirect("/student/applications?error=closed");
  redirect(error || !data ? `/projects/${slug}?application_error=${error ? applyError(error.message) : "failed"}` : "/student/applications?sent=1");
}

function decisionError(message: string): string {
  if (message === "Role is full") return "full";
  if (message === "Student is already on a project") return "on_project";
  if (message === "Student is no longer eligible") return "eligibility";
  if (message === "Application is no longer pending") return "decided";
  if (message === "Project is closed") return "closed";
  return "failed";
}

export async function decideApplication(form: FormData): Promise<void> {
  await requireRole("BUSINESS");
  const projectId = field(form, "projectId");
  const applicationId = field(form, "applicationId");
  const decision = field(form, "decision");
  if (!uuidPattern.test(projectId)) redirect("/business/projects");
  if (!uuidPattern.test(applicationId) || !["ACCEPTED", "REJECTED"].includes(decision)) {
    redirect(`/business/projects/${projectId}/applications?error=validation`);
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("business_decide_application", { p_application_id: applicationId, p_decision: decision });
  redirect(error ? `/business/projects/${projectId}/applications?error=${decisionError(error.message)}` : `/business/projects/${projectId}/applications?decided=1`);
}

export async function completeProject(form: FormData): Promise<void> {
  await requireRole("BUSINESS");
  const projectId = field(form, "projectId");
  if (!uuidPattern.test(projectId)) redirect("/business/projects");
  if (field(form, "confirm") !== "yes") redirect(`/business/projects/${projectId}/applications?error=validation`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("business_complete_project", { p_project_id: projectId });
  redirect(error ? `/business/projects/${projectId}/applications?error=complete` : `/business/projects/${projectId}/applications?completed=1`);
}
