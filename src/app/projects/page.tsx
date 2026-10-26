import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{ q?: string; category?: string; difficulty?: string; payment?: string; skill?: string }>;
type PublicProject = { project_slug: string; title: string; problem_statement: string; category_name: string; category_slug: string; difficulty: string; payment_type: string; proposed_compensation_amount: number | null; estimated_duration_days: number | null; published_at: string; business_name: string; business_description: string; business_verified: boolean; roles: { title: string; slotCount: number; requiredSkills: string[]; preferredSkills: string[] }[] };

const difficultyLabels: Record<string, string> = { BEGINNER: "Pemula", INTERMEDIATE: "Menengah", ADVANCED: "Lanjutan" };

export default async function ProjectMarketplace({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const q = params.q?.slice(0, 120) ?? "";
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: categories }, { data: skills }] = await Promise.all([
    supabase.rpc("project_marketplace", { p_q: q || null, p_category: params.category || null, p_difficulty: params.difficulty || null, p_payment: params.payment || null, p_skill: params.skill || null, p_slug: null, p_limit: 50, p_offset: 0 }),
    supabase.from("project_categories").select("name,slug").eq("is_active", true).order("name"),
    supabase.from("skills").select("name,slug").eq("is_active", true).order("name"),
  ]);
  const projects = (data ?? []) as PublicProject[];

  return <div className="marketplace-page">
    <header className="marketplace-heading">
      <p className="eyebrow">Project marketplace</p>
      <h1>Temukan project untuk skill kamu.</h1>
      <p className="muted">Kerjakan tantangan digital nyata bersama UMKM terverifikasi. Pilih project yang cocok dengan minat dan kemampuanmu.</p>
    </header>
    <form action="/projects" method="get" className="filter-form" aria-label="Filter project">
      <label className="field">Cari project<input type="search" name="q" maxLength={120} defaultValue={q} placeholder="Judul atau masalah"/></label>
      <label className="field">Kategori<select name="category" defaultValue={params.category ?? ""}><option value="">Semua kategori</option>{(categories ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      <label className="field">Tingkat<select name="difficulty" defaultValue={params.difficulty ?? ""}><option value="">Semua tingkat</option><option value="BEGINNER">Pemula</option><option value="INTERMEDIATE">Menengah</option><option value="ADVANCED">Lanjutan</option></select></label>
      <label className="field">Kompensasi<select name="payment" defaultValue={params.payment ?? ""}><option value="">Semua</option><option value="PAID">Berbayar</option><option value="UNPAID">Tidak berbayar</option></select></label>
      <label className="field">Skill<select name="skill" defaultValue={params.skill ?? ""}><option value="">Semua skill</option>{(skills ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      <button className="button button-primary" type="submit">Cari project</button>
    </form>
    <div className="marketplace-results"><div><p className="eyebrow">Peluang tersedia</p><h2>{projects.length} project ditemukan</h2></div><span>Project telah ditinjau admin</span></div>
    <section className="project-grid" aria-label="Project tersedia">
      {!projects.length && <div className="project-empty"><h2>Belum ada project yang cocok</h2><p className="muted">Coba kata kunci atau filter lain untuk menemukan peluang yang sesuai.</p><Link className="button button-secondary" href="/projects">Hapus filter</Link></div>}
      {projects.map((project) => <article className="project-card" key={project.project_slug}>
        <div className="project-card-top"><span className="project-category">{project.category_name}</span><span className="project-difficulty">{difficultyLabels[project.difficulty] ?? project.difficulty}</span></div>
        <h2><Link href={`/projects/${project.project_slug}`}>{project.title}</Link></h2>
        <p className="project-business">{project.business_name} {project.business_verified && <span aria-label="Usaha terverifikasi">✓ Terverifikasi</span>}</p>
        <p className="project-description">{project.problem_statement}</p>
        <div className="project-meta"><span>{project.payment_type === "PAID" ? "Berbayar" : "Tidak berbayar"}</span>{project.estimated_duration_days && <span>{project.estimated_duration_days} hari</span>}{project.roles.length > 0 && <span>{project.roles.length} role</span>}</div>
        <div className="project-card-footer"><span>Terbit {new Date(project.published_at).toLocaleDateString("id-ID")}</span><Link href={`/projects/${project.project_slug}`}>Lihat detail <span aria-hidden="true">↗</span></Link></div>
      </article>)}
    </section>
  </div>;
}
