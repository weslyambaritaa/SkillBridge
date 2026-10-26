import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { cancelProject, submitProjectForReview } from "@/features/projects/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projectSubmissionMessages } from "@/features/projects/submission-errors";
import { projectDifficultyLabel, projectModerationLabel, projectPaymentLabel, reviewDecisionLabel } from "@/lib/status-labels";

type Detail = {
  id: string; slug: string; title: string; problemStatement: string; objective: string; scope: string; expectedDeliverables: string;
  categoryId: string; difficulty: string; paymentType: string; proposedCompensationAmount: number | null;
  estimatedDurationDays: number | null; moderationStatus: string; lifecycleStatus: string; visibility: string; publishedAt: string | null;
  cancellationReason: string | null; roles: { title: string; description: string; slotCount: number; requiredSkillIds: string[]; preferredSkillIds: string[] }[];
  history: { attemptNumber: number; decision: string | null; reason: string | null; submittedAt: string }[];
};

export default async function BusinessProjectDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; reason?: string; cancelled?: string }> }) {
  await requireRole("BUSINESS");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: skills }, { data: execution }, { data: applications }, query] = await Promise.all([
    supabase.rpc("business_get_project", { p_project_id: id }),
    supabase.from("skills").select("id,name").order("name"),
    supabase.rpc("business_project_execution", { p_project_id: id }),
    supabase.rpc("business_list_project_applications", { p_project_id: id }),
    searchParams,
  ]);
  if (!data) notFound();
  const project = data as Detail;
  const executionStatus = (execution as string | null) ?? "OPEN";
  const hasApplications = Boolean(applications?.length);
  const skillNames = new Map(((skills ?? []) as { id: string; name: string }[]).map((item) => [item.id,item.name]));
  const canCancel = executionStatus === "OPEN" && !hasApplications && project.lifecycleStatus === "NOT_STARTED" && ["DRAFT","REVISION_REQUESTED","APPROVED"].includes(project.moderationStatus);
  const canSubmit = executionStatus === "OPEN" && project.lifecycleStatus === "NOT_STARTED" && ["DRAFT","REVISION_REQUESTED","REJECTED"].includes(project.moderationStatus);
  const rolesWithoutRequiredSkills = project.roles.filter((role) => role.requiredSkillIds.length === 0);
  const submissionNeeds = project.roles.length === 0 ? "Tambahkan minimal satu role sebelum mengirim proyek." :
    rolesWithoutRequiredSkills.length > 0 ? `Skill wajib (Required) belum tersimpan pada role: ${rolesWithoutRequiredSkills.map((role) => role.title).join(", ")}. Buka editor, pilih Required pada tiap role tersebut, lalu simpan draft.` : null;

  return <section className="dashboard-card form-stack"><p className="eyebrow">Detail project · {projectModerationLabel(project.moderationStatus)}</p><h1>{project.title}</h1>
    {query.error && <p className="notice notice-error">{query.error === "submit" ? projectSubmissionMessages[query.reason ?? "unavailable"] ?? projectSubmissionMessages.unavailable : "Pembatalan proyek gagal. Periksa status proyek terbaru."}</p>}{query.cancelled && <p className="notice notice-success">Project dibatalkan. Project dan riwayat tetap tersimpan.</p>}
    <p><strong>Kesulitan:</strong> {projectDifficultyLabel(project.difficulty)} · <strong>Penawaran:</strong> {projectPaymentLabel(project.paymentType)}{project.proposedCompensationAmount ? ` · Rp ${project.proposedCompensationAmount.toLocaleString("id-ID")} diiklankan` : ""}{project.estimatedDurationDays ? ` · ${project.estimatedDurationDays} hari` : ""}</p>
    <ProjectCopy label="Masalah" value={project.problemStatement}/><ProjectCopy label="Tujuan" value={project.objective}/><ProjectCopy label="Lingkup" value={project.scope}/><ProjectCopy label="Hasil yang diharapkan" value={project.expectedDeliverables}/>
    <h2>Roles</h2>{project.roles.map((role,index) => <article className="review-card" key={`${role.title}-${index}`}><h3>{role.title} · {role.slotCount} slots</h3><p>{role.description}</p><p><strong>Required:</strong> {role.requiredSkillIds.map((skill) => skillNames.get(skill) ?? "Skill nonaktif").join(", ") || "Belum ditentukan"}</p><p><strong>Preferred:</strong> {role.preferredSkillIds.map((skill) => skillNames.get(skill) ?? "Skill nonaktif").join(", ") || "—"}</p></article>)}
    {project.history.map((review) => <p className="muted" key={review.attemptNumber}>Pengajuan #{review.attemptNumber}: {reviewDecisionLabel(review.decision)}{review.reason ? ` · ${review.reason}` : ""}</p>)}
    {project.visibility === "PUBLIC" && project.publishedAt && <p><a className="text-link" href={`/projects/${project.slug}`}>Buka listing public</a></p>}
    <p className="status-panel"><strong>Status pengerjaan:</strong> {executionStatus === "ACTIVE" ? "Sedang dikerjakan" : executionStatus === "COMPLETED" ? "Selesai" : "Belum dimulai"}</p>
    <div className="form-actions">{executionStatus === "OPEN" && !hasApplications && <Link className="button button-secondary" href={`/business/projects/${id}/edit`}>Edit project</Link>}<Link className="text-link" href={`/business/projects/${id}/applications`}>Lamaran dan pengerjaan</Link><Link className="text-link" href={`/business/projects/${id}/review-status`}>Lihat status review</Link><Link className="text-link" href={`/business/projects`}>Daftar project</Link></div>
    {canSubmit && submissionNeeds && <p className="notice notice-error">{submissionNeeds} <Link href={`/business/projects/${id}/edit`}>Lengkapi proyek</Link></p>}
    {canSubmit && <form action={submitProjectForReview}><input type="hidden" name="projectId" value={id}/><button className="button button-primary" disabled={Boolean(submissionNeeds)}>Submit untuk review Admin</button></form>}
    {canCancel && <form action={cancelProject} className="form-stack"><input type="hidden" name="projectId" value={id}/><label className="field">Alasan pembatalan (opsional)<textarea name="reason" maxLength={1200}/></label><button className="button button-secondary">Batalkan project</button></form>}
  </section>;
}

function ProjectCopy({ label, value }: { label: string; value: string }) { return <div><h2>{label}</h2><p className="muted preserve-lines">{value}</p></div>; }
