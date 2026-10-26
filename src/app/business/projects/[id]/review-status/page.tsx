import { notFound } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projectLifecycleLabel, projectModerationLabel, projectVisibilityLabel, reviewDecisionLabel } from "@/lib/status-labels";

type ReviewStatusData = { id: string; title: string; moderationStatus: string; visibility: string; publishedAt: string | null; lifecycleStatus: string; history: { attemptNumber: number; submittedAt: string; reviewStartedAt: string | null; reviewedAt: string | null; decision: string | null; reason: string | null }[] };

export default async function BusinessReviewStatusPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("BUSINESS");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("business_get_project", { p_project_id: id });
  if (!data) notFound();
  const project = data as ReviewStatusData;
  return <section className="dashboard-card form-stack"><p className="eyebrow">Riwayat peninjauan</p><h1>{project.title}</h1><p className="status-panel">{projectModerationLabel(project.moderationStatus)} · {projectVisibilityLabel(project.visibility)} · {projectLifecycleLabel(project.lifecycleStatus)}{project.publishedAt ? ` · Tayang ${new Date(project.publishedAt).toLocaleString("id-ID")}` : ""}</p>
    {!project.history.length && <p className="muted">Project belum pernah disubmit.</p>}
    {project.history.map((review) => <article className="review-card" key={review.attemptNumber}><h2>Pengajuan #{review.attemptNumber}</h2><p>Dikirim: {new Date(review.submittedAt).toLocaleString("id-ID")}</p>{review.reviewStartedAt && <p>Peninjauan dimulai: {new Date(review.reviewStartedAt).toLocaleString("id-ID")}</p>}{review.reviewedAt && <p>Diputuskan: {new Date(review.reviewedAt).toLocaleString("id-ID")}</p>}<p>Keputusan: {reviewDecisionLabel(review.decision)}</p>{review.reason && <p>Catatan Admin: {review.reason}</p>}</article>)}
  </section>;
}
