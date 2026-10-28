import { notFound } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decideProjectModeration, startAdminProjectReview } from "@/features/projects/actions";
import { projectDifficultyLabel, projectModerationLabel, projectPaymentLabel, reviewDecisionLabel, verificationStatusLabel } from "@/lib/status-labels";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type Detail = { id: string; slug: string; title: string; problemStatement: string; objective: string; scope: string; expectedDeliverables: string; difficulty: string; paymentType: string; proposedCompensationAmount: number | null; estimatedDurationDays: number | null; moderationStatus: string; lifecycleStatus: string; visibility: string; category: string; businessName: string; businessDescription: string; businessVerificationStatus: string; roles: { title: string; description: string; slotCount: number; requiredSkills: string[]; preferredSkills: string[] }[]; history: { attemptNumber: number; submittedAt: string; reviewStartedAt: string | null; reviewedAt: string | null; reviewerAccountId: string | null; decision: string | null; reason: string | null }[] };

export default async function AdminProjectReviewDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; review?: string; decided?: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, query] = await Promise.all([supabase.rpc("admin_get_project", { p_project_id: id }), searchParams]);
  if (!data) notFound();
  const project = data as Detail;
  return <section className="dashboard-card form-stack"><p className="eyebrow">Peninjauan admin · {projectModerationLabel(project.moderationStatus)}</p><h1>{project.title}</h1>
    {query.error && <p className="notice notice-error">Aksi tidak tersedia untuk status ini.</p>}{query.review && <p className="notice notice-success">Review dibuka. Project sekarang terkunci untuk edit Business.</p>}{query.decided && <p className="notice notice-success">Keputusan dan publikasi tersimpan secara atomik.</p>}
    <p><strong>Usaha:</strong> {project.businessName} · {verificationStatusLabel(project.businessVerificationStatus)}</p><p>{project.businessDescription}</p>
    <p><strong>Kategori:</strong> {project.category} · <strong>Kesulitan:</strong> {projectDifficultyLabel(project.difficulty)} · <strong>Penawaran:</strong> {projectPaymentLabel(project.paymentType)}{project.proposedCompensationAmount ? ` · Rp ${project.proposedCompensationAmount.toLocaleString("id-ID")} diiklankan` : ""}{project.estimatedDurationDays ? ` · ${project.estimatedDurationDays} hari` : ""}</p>
    <ProjectText label="Problem" value={project.problemStatement}/><ProjectText label="Objective" value={project.objective}/><ProjectText label="Scope" value={project.scope}/><ProjectText label="Expected deliverables" value={project.expectedDeliverables}/>
    <h2>Roles dan skills</h2>{project.roles.map((role,index) => <article className="review-card" key={`${role.title}-${index}`}><h3>{role.title} · {role.slotCount} slots</h3><p>{role.description}</p><p>Required: {role.requiredSkills.join(", ")}</p><p>Preferred: {role.preferredSkills.join(", ") || "—"}</p></article>)}
    <h2>Riwayat peninjauan</h2>{project.history.map((attempt) => <article className="review-card" key={attempt.attemptNumber}><h3>Pengajuan #{attempt.attemptNumber} · {reviewDecisionLabel(attempt.decision)}</h3><p>Dikirim {new Date(attempt.submittedAt).toLocaleString("id-ID")}</p>{attempt.reviewStartedAt && <p>Peninjauan dimulai {new Date(attempt.reviewStartedAt).toLocaleString("id-ID")}</p>}{attempt.reviewedAt && <p>Diputuskan {new Date(attempt.reviewedAt).toLocaleString("id-ID")}</p>}{attempt.reviewerAccountId && <p>ID akun peninjau: {attempt.reviewerAccountId}</p>}{attempt.reason && <p>Alasan: {attempt.reason}</p>}</article>)}
    {project.moderationStatus === "SUBMITTED" && <form action={startAdminProjectReview}><input type="hidden" name="projectId" value={id}/><PendingSubmitButton pendingLabel="Membuka review...">Mulai peninjauan</PendingSubmitButton></form>}
    {project.moderationStatus === "UNDER_REVIEW" && <form action={decideProjectModeration} className="form-stack"><input type="hidden" name="projectId" value={id}/><label className="field">Alasan jika meminta perbaikan atau menolak<textarea name="reason" maxLength={1600}/></label><div className="form-actions"><PendingSubmitButton name="decision" value="APPROVED" pendingLabel="Menyimpan keputusan...">Setujui dan publikasikan</PendingSubmitButton><PendingSubmitButton className="button button-secondary" name="decision" value="REQUEST_REVISION" pendingLabel="Menyimpan keputusan...">Minta perbaikan</PendingSubmitButton><PendingSubmitButton className="button button-secondary" name="decision" value="REJECTED" pendingLabel="Menyimpan keputusan...">Tolak</PendingSubmitButton></div></form>}
  </section>;
}

function ProjectText({ label, value }: { label: string; value: string }) { return <div><h2>{label}</h2><p className="muted preserve-lines">{value}</p></div>; }
