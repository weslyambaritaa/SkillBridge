import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projectLifecycleLabel, projectModerationLabel, projectVisibilityLabel } from "@/lib/status-labels";

type ProjectRow = { project_id: string; public_slug: string; title: string; moderation_status: string; lifecycle_status: string; visibility: string; published_at: string | null; updated_at: string };

export default async function BusinessProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("BUSINESS");
  const supabase = await createSupabaseServerClient();
  const [{ data }, params] = await Promise.all([supabase.rpc("business_list_projects"), searchParams]);
  const projects = (data ?? []) as ProjectRow[];
  return <section className="dashboard-card form-stack"><p className="eyebrow">Project workspace</p><h1>Project usaha</h1>
    <p className="muted">Kelola draft, peran yang dibutuhkan, pengajuan review, dan status publikasi.</p>
    {params.error && <p className="notice notice-error">Project tidak dapat diproses.</p>}
    <Link className="button button-primary button-link" href="/business/projects/new">Buat project draft</Link>
    {!projects.length && <p className="muted">Belum ada project.</p>}
    <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.project_id}>
      <p className="eyebrow">{projectModerationLabel(project.moderation_status)} · {projectLifecycleLabel(project.lifecycle_status)}</p><h2>{project.title}</h2>
      <p className="muted">Visibilitas: {projectVisibilityLabel(project.visibility)}{project.published_at ? ` · terbit ${new Date(project.published_at).toLocaleDateString("id-ID")}` : ""}</p>
      <div className="form-actions"><Link className="text-link" href={`/business/projects/${project.project_id}`}>Preview dan status</Link><Link className="text-link" href={`/business/projects/${project.project_id}/applications`}>Lamaran dan pengerjaan</Link><Link className="text-link" href={`/business/projects/${project.project_id}/review-status`}>Riwayat review</Link></div>
    </article>)}</div>
  </section>;
}
