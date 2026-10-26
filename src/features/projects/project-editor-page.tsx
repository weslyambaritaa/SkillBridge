import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProjectEditorForm, type EditorProject } from "@/features/projects/project-editor-form";

type Taxonomy = { id: string; name: string; category?: string | null };

export async function ProjectEditorPage({ projectId, searchParams }: { projectId?: string; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("BUSINESS");
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: skills }, projectResult, applicationsResult, executionResult, params] = await Promise.all([
    supabase.from("project_categories").select("id,name").eq("is_active", true).order("name"),
    supabase.from("skills").select("id,name,category").eq("is_active", true).order("name"),
    projectId ? supabase.rpc("business_get_project", { p_project_id: projectId }) : Promise.resolve({ data: null, error: null }),
    projectId ? supabase.rpc("business_list_project_applications", { p_project_id: projectId }) : Promise.resolve({ data: null }),
    projectId ? supabase.rpc("business_project_execution", { p_project_id: projectId }) : Promise.resolve({ data: null }),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  if (projectId && !projectResult.data) notFound();
  const project = projectResult.data as (EditorProject & { moderationStatus?: string; lifecycleStatus?: string; id: string }) | null;
  if (project && (project.lifecycleStatus === "CANCELLED" || !["DRAFT", "REVISION_REQUESTED", "REJECTED", "APPROVED"].includes(project.moderationStatus ?? ""))) notFound();
  if (projectId && ((applicationsResult.data?.length ?? 0) > 0 || (executionResult.data && executionResult.data !== "OPEN"))) {
    return <section className="dashboard-card form-stack"><h1>Proyek sudah menerima lamaran</h1>
      <p className="notice">Rincian proyek terkunci setelah lamaran pertama agar syarat yang dilihat Student tetap sama.</p>
      <Link className="button button-secondary button-link" href={`/business/projects/${projectId}/applications`}>Lihat lamaran dan status pengerjaan</Link>
    </section>;
  }
  return <section className="dashboard-card form-stack">
    <p className="eyebrow">Project workspace</p><h1>{project ? "Edit project draft" : "Buat project draft"}</h1>
    <p className="muted">Project hanya dapat dibuat oleh business yang sudah verified. Setiap role perlu required skill. Submit akan mengunci perubahan sampai hasil review Admin.</p>
    {params?.saved && <p className="notice notice-success">Draft tersimpan. Perubahan project yang sudah approved akan meminta review ulang.</p>}
    <ProjectEditorForm project={project ?? undefined} categories={(categories ?? []) as Taxonomy[]} skills={(skills ?? []) as Taxonomy[]} error={Boolean(params?.error) ? "save" : undefined}/>
  </section>;
}
