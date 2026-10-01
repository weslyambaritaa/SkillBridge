"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projectDraftSchema, projectModerationSchema } from "@/features/projects/schemas";

const value = (form: FormData, key: string) => {
  const entry = form.get(key);
  return typeof entry === "string" ? entry : "";
};

function parseProjectPayload(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return projectDraftSchema.safeParse(parsed);
  } catch {
    return { success: false as const };
  }
}

export async function saveProjectDraft(form: FormData): Promise<void> {
  await requireRole("BUSINESS");
  const projectId = value(form, "projectId");
  if (projectId && !/^[0-9a-f-]{36}$/iu.test(projectId)) redirect("/business/projects?error=project");
  const parsed = parseProjectPayload(value(form, "payload"));
  if (!parsed.success) redirect(`/business/projects${projectId ? `/${projectId}/edit` : "/new"}?error=validation`);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_project_draft", { p_project_id: projectId || null, p_payload: parsed.data });
  if (error || !data) redirect(`/business/projects${projectId ? `/${projectId}/edit` : "/new"}?error=save`);
  redirect(`/business/projects/${data}/edit?saved=1`);
}

export async function submitProjectForReview(form: FormData): Promise<void> {
  await requireRole("BUSINESS");
  const projectId = value(form, "projectId");
  if (!/^[0-9a-f-]{36}$/iu.test(projectId)) redirect("/business/projects?error=project");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_project_for_review", { p_project_id: projectId });
  redirect(error ? `/business/projects/${projectId}?error=submit` : `/business/projects/${projectId}/review-status?submitted=1`);
}

export async function cancelProject(form: FormData): Promise<void> {
  await requireRole("BUSINESS");
  const projectId = value(form, "projectId");
  if (!/^[0-9a-f-]{36}$/iu.test(projectId)) redirect("/business/projects?error=project");
  const reason = value(form, "reason").trim();
  if (reason.length > 1200) redirect(`/business/projects/${projectId}?error=cancel`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_project", { p_project_id: projectId, p_reason: reason || null });
  redirect(error ? `/business/projects/${projectId}?error=cancel` : `/business/projects/${projectId}?cancelled=1`);
}

export async function startAdminProjectReview(form: FormData): Promise<void> {
  await requireRole("ADMIN");
  const projectId = value(form, "projectId");
  if (!/^[0-9a-f-]{36}$/iu.test(projectId)) redirect("/admin/project-review?error=project");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_start_project_review", { p_project_id: projectId });
  redirect(error ? `/admin/project-review/${projectId}?error=review` : `/admin/project-review/${projectId}?review=started`);
}

export async function decideProjectModeration(form: FormData): Promise<void> {
  await requireRole("ADMIN");
  const parsed = projectModerationSchema.safeParse({ projectId: value(form, "projectId"), decision: value(form, "decision"), reason: value(form, "reason") });
  if (!parsed.success || (parsed.data.decision !== "APPROVED" && parsed.data.reason.length < 3)) redirect("/admin/project-review?error=decision");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_decide_project", { p_project_id: parsed.data.projectId, p_decision: parsed.data.decision, p_reason: parsed.data.reason || null });
  redirect(error ? `/admin/project-review/${parsed.data.projectId}?error=decision` : `/admin/project-review/${parsed.data.projectId}?decided=1`);
}
