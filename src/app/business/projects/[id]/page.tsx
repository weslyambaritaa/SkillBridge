import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { cancelProject, submitProjectForReview } from "@/features/projects/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Detail = {
  id: string; slug: string; title: string; problemStatement: string; objective: string; scope: string; expectedDeliverables: string;
  categoryId: string; difficulty: string; paymentType: string; proposedCompensationAmount: number | null;
  estimatedDurationDays: number | null; moderationStatus: string; lifecycleStatus: string; visibility: string; publishedAt: string | null;
  cancellationReason: string | null; roles: { title: string; description: string; slotCount: number; requiredSkillIds: string[]; preferredSkillIds: string[] }[];
  history: { attemptNumber: number; decision: string | null; reason: string | null; submittedAt: string }[];
};

export default async function BusinessProjectDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; cancelled?: string }> }) {
  await requireRole("BUSINESS");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: skills }, query] = await Promise.all([
    supabase.rpc("business_get_project", { p_project_id: id }),
    supabase.from("skills").select("id,name").order("name"),
    searchParams,
  ]);
  if (!data) notFound();
  const project = data as Detail;
  const skillNames = new Map(((skills ?? []) as { id: string; name: string }[]).map((item) => [item.id,item.name]));
  const canCancel = project.lifecycleStatus === "NOT_STARTED" && ["DRAFT","REVISION_REQUESTED","APPROVED"].includes(project.moderationStatus);
  const canSubmit = project.lifecycleStatus === "NOT_STARTED" && ["DRAFT","REVISION_REQUESTED","REJECTED"].includes(project.moderationStatus);

  return <section className="dashboard-card form-stack"><p className="eyebrow">Preview draft · {project.moderationStatus}</p><h1>{project.title}</h1>
    {query.error && <p className="notice notice-error">Aksi tidak tersedia untuk status project ini.</p>}{query.cancelled && <p className="notice notice-success">Project dibatalkan. Project dan riwayat tetap tersimpan.</p>}
    <p><strong>Kesulitan:</strong> {project.difficulty} · <strong>Penawaran:</strong> {project.paymentType}{project.proposedCompensationAmount ? ` · Rp ${project.proposedCompensationAmount.toLocaleString("id-ID")} diiklankan` : ""}{project.estimatedDurationDays ? ` · ${project.estimatedDurationDays} hari` : ""}</p>
    <ProjectCopy label="Masalah" value={project.problemStatement}/><ProjectCopy label="Tujuan" value={project.objective}/><ProjectCopy label="Lingkup" value={project.scope}/><ProjectCopy label="Hasil yang diharapkan" value={project.expectedDeliverables}/>
    <h2>Roles</h2>{project.roles.map((role,index) => <article className="review-card" key={`${role.title}-${index}`}><h3>{role.title} · {role.slotCount} slots</h3><p>{role.description}</p><p><strong>Required:</strong> {role.requiredSkillIds.map((skill) => skillNames.get(skill) ?? "Skill nonaktif").join(", ") || "Belum ditentukan"}</p><p><strong>Preferred:</strong> {role.preferredSkillIds.map((skill) => skillNames.get(skill) ?? "Skill nonaktif").join(", ") || "—"}</p></article>)}
    {project.history.map((review) => <p className="muted" key={review.attemptNumber}>Attempt #{review.attemptNumber}: {review.decision ?? "Menunggu review"}{review.reason ? ` · ${review.reason}` : ""}</p>)}
    {project.visibility === "PUBLIC" && project.publishedAt && <p><a className="text-link" href={`/projects/${project.slug}`}>Buka listing public</a></p>}
    <div className="form-actions"><Link className="button button-secondary" href={`/business/projects/${id}/edit`}>Edit project</Link><Link className="text-link" href={`/business/projects/${id}/review-status`}>Lihat status review</Link><Link className="text-link" href={`/business/projects`}>Daftar project</Link></div>
    {canSubmit && <form action={submitProjectForReview}><input type="hidden" name="projectId" value={id}/><button className="button button-primary">Submit untuk review Admin</button></form>}
    {canCancel && <form action={cancelProject} className="form-stack"><input type="hidden" name="projectId" value={id}/><label className="field">Alasan pembatalan (opsional)<textarea name="reason" maxLength={1200}/></label><button className="button button-secondary">Batalkan project</button></form>}
  </section>;
}

function ProjectCopy({ label, value }: { label: string; value: string }) { return <div><h2>{label}</h2><p className="muted preserve-lines">{value}</p></div>; }
