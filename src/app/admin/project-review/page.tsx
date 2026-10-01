import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReviewRow = { project_id: string; title: string; public_slug: string; submitted_at: string; business_name: string; business_verified: boolean; category: string; difficulty: string; payment_type: string; moderation_status: string };

export default async function AdminProjectReviewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("ADMIN");
  const supabase = await createSupabaseServerClient();
  const [{ data }, params] = await Promise.all([supabase.rpc("admin_project_review_queue"), searchParams]);
  const rows = (data ?? []) as ReviewRow[];
  return <section className="dashboard-card form-stack"><p className="eyebrow">Project moderation</p><h1>Antrean review project</h1>
    {params.error && <p className="notice notice-error">Aksi review gagal.</p>}
    {!rows.length && <p className="muted">Tidak ada project menunggu review.</p>}
    {rows.map((project) => <article className="review-card" key={project.project_id}><p className="eyebrow">{project.moderation_status}</p><h2>{project.title}</h2><p>{project.business_name} · {project.business_verified ? "Business verified" : "Business belum verified"}</p><p>{project.category} · {project.difficulty} · {project.payment_type}</p><p>Dikirim {new Date(project.submitted_at).toLocaleString("id-ID")}</p><Link className="button button-primary button-link" href={`/admin/project-review/${project.project_id}`}>Buka detail review</Link></article>)}
  </section>;
}
