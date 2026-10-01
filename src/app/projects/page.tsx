import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{ q?: string; category?: string; difficulty?: string; payment?: string; skill?: string }>;
type PublicProject = { project_slug: string; title: string; problem_statement: string; category_name: string; category_slug: string; difficulty: string; payment_type: string; proposed_compensation_amount: number | null; estimated_duration_days: number | null; published_at: string; business_name: string; business_description: string; business_verified: boolean; roles: { title: string; slotCount: number; requiredSkills: string[]; preferredSkills: string[] }[] };

export default async function ProjectMarketplace({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const q = params.q?.slice(0,120) ?? "";
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: categories }, { data: skills }] = await Promise.all([
    supabase.rpc("project_marketplace", { p_q: q || null, p_category: params.category || null, p_difficulty: params.difficulty || null, p_payment: params.payment || null, p_skill: params.skill || null, p_slug: null, p_limit: 50, p_offset: 0 }),
    supabase.from("project_categories").select("name,slug").eq("is_active",true).order("name"),
    supabase.from("skills").select("name,slug").eq("is_active",true).order("name"),
  ]);
  const projects = (data ?? []) as PublicProject[];
  return <main className="marketplace-page"><header className="site-header"><Link className="wordmark" href="/">SkillBridge</Link><nav className="header-actions"><Link className="text-link" href="/login">Masuk</Link><Link className="button button-primary button-link" href="/register">Buat akun</Link></nav></header>
    <section className="marketplace-heading"><p className="eyebrow">Project marketplace</p><h1>Project transformasi digital nyata</h1><p className="muted">Browse project yang telah ditinjau Admin dari business terverifikasi.</p></section>
    <form action="/projects" method="get" className="filter-form">
      <label className="field">Cari judul atau masalah<input type="search" name="q" maxLength={120} defaultValue={q}/></label>
      <label className="field">Kategori<select name="category" defaultValue={params.category ?? ""}><option value="">Semua kategori</option>{(categories ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      <label className="field">Kesulitan<select name="difficulty" defaultValue={params.difficulty ?? ""}><option value="">Semua tingkat</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
      <label className="field">Penawaran<select name="payment" defaultValue={params.payment ?? ""}><option value="">Semua</option><option value="PAID">Paid</option><option value="UNPAID">Unpaid</option></select></label>
      <label className="field">Skill<select name="skill" defaultValue={params.skill ?? ""}><option value="">Semua skill</option>{(skills ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      <button className="button button-primary">Terapkan filter</button>
    </form>
    <section className="project-grid" aria-label="Project published">
      {!projects.length && <p className="muted">Belum ada project yang cocok dengan filter ini.</p>}
      {projects.map((project) => <article className="project-card" key={project.project_slug}>
        <p className="eyebrow">{project.category_name} · {project.difficulty}</p><h2><Link href={`/projects/${project.project_slug}`}>{project.title}</Link></h2>
        <p className="muted project-business">{project.business_name} <span aria-label="Business terverifikasi">✓ Verified</span></p><p>{project.problem_statement}</p>
        <p><strong>{project.payment_type}</strong>{project.payment_type === "PAID" && project.proposed_compensation_amount ? ` · Usulan Rp ${project.proposed_compensation_amount.toLocaleString("id-ID")}` : ""}{project.estimated_duration_days ? ` · ${project.estimated_duration_days} hari` : ""}</p>
        <RoleSummary roles={project.roles}/><p className="muted">Terbit {new Date(project.published_at).toLocaleDateString("id-ID")}</p>
      </article>)}
    </section>
  </main>;
}

function RoleSummary({ roles }: { roles: PublicProject["roles"] }) { return <ul>{roles.map((role,index) => <li key={`${role.title}-${index}`}>{role.title} ({role.slotCount} slots): {role.requiredSkills.join(", ")}</li>)}</ul>; }
