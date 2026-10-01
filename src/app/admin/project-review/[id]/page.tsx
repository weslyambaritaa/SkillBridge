import { notFound } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decideProjectModeration, startAdminProjectReview } from "@/features/projects/actions";

type Detail = { id: string; slug: string; title: string; problemStatement: string; objective: string; scope: string; expectedDeliverables: string; difficulty: string; paymentType: string; proposedCompensationAmount: number | null; estimatedDurationDays: number | null; moderationStatus: string; lifecycleStatus: string; visibility: string; category: string; businessName: string; businessDescription: string; businessVerificationStatus: string; roles: { title: string; description: string; slotCount: number; requiredSkills: string[]; preferredSkills: string[] }[]; history: { attemptNumber: number; submittedAt: string; reviewStartedAt: string | null; reviewedAt: string | null; reviewerAccountId: string | null; decision: string | null; reason: string | null }[] };

export default async function AdminProjectReviewDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; review?: string; decided?: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, query] = await Promise.all([supabase.rpc("admin_get_project", { p_project_id: id }), searchParams]);
  if (!data) notFound();
  const project = data as Detail;
  return <section className="dashboard-card form-stack"><p className="eyebrow">Admin review · {project.moderationStatus}</p><h1>{project.title}</h1>
    {query.error && <p className="notice notice-error">Aksi tidak tersedia untuk status ini.</p>}{query.review && <p className="notice notice-success">Review dibuka. Project sekarang terkunci untuk edit Business.</p>}{query.decided && <p className="notice notice-success">Keputusan dan publikasi tersimpan secara atomik.</p>}
    <p><strong>Business:</strong> {project.businessName} · verifikasi {project.businessVerificationStatus}</p><p>{project.businessDescription}</p>
    <p><strong>Kategori:</strong> {project.category} · <strong>Kesulitan:</strong> {project.difficulty} · <strong>Penawaran:</strong> {project.paymentType}{project.proposedCompensationAmount ? ` · Rp ${project.proposedCompensationAmount.toLocaleString("id-ID")} (advertised)` : ""}{project.estimatedDurationDays ? ` · ${project.estimatedDurationDays} hari` : ""}</p>
    <ProjectText label="Problem" value={project.problemStatement}/><ProjectText label="Objective" value={project.objective}/><ProjectText label="Scope" value={project.scope}/><ProjectText label="Expected deliverables" value={project.expectedDeliverables}/>
    <h2>Roles dan skills</h2>{project.roles.map((role,index) => <article className="review-card" key={`${role.title}-${index}`}><h3>{role.title} · {role.slotCount} slots</h3><p>{role.description}</p><p>Required: {role.requiredSkills.join(", ")}</p><p>Preferred: {role.preferredSkills.join(", ") || "—"}</p></article>)}
    <h2>Moderation history</h2>{project.history.map((attempt) => <article className="review-card" key={attempt.attemptNumber}><h3>Attempt #{attempt.attemptNumber} · {attempt.decision ?? "OPEN"}</h3><p>Submitted {new Date(attempt.submittedAt).toLocaleString("id-ID")}</p>{attempt.reviewStartedAt && <p>Review started {new Date(attempt.reviewStartedAt).toLocaleString("id-ID")}</p>}{attempt.reviewedAt && <p>Reviewed {new Date(attempt.reviewedAt).toLocaleString("id-ID")}</p>}{attempt.reviewerAccountId && <p>Reviewer account ID: {attempt.reviewerAccountId}</p>}{attempt.reason && <p>Reason: {attempt.reason}</p>}</article>)}
    {project.moderationStatus === "SUBMITTED" && <form action={startAdminProjectReview}><input type="hidden" name="projectId" value={id}/><button className="button button-primary">Start review</button></form>}
    {project.moderationStatus === "UNDER_REVIEW" && <form action={decideProjectModeration} className="form-stack"><input type="hidden" name="projectId" value={id}/><label className="field">Alasan untuk revision/reject (wajib)<textarea name="reason" maxLength={1600}/></label><div className="form-actions"><button className="button button-primary" name="decision" value="APPROVED">Approve & publish</button><button className="button button-secondary" name="decision" value="REQUEST_REVISION">Request revision</button><button className="button button-secondary" name="decision" value="REJECTED">Reject</button></div></form>}
  </section>;
}

function ProjectText({ label, value }: { label: string; value: string }) { return <div><h2>{label}</h2><p className="muted preserve-lines">{value}</p></div>; }
