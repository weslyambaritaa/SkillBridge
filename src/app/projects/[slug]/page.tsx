import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Detail = { project_slug: string; title: string; problem_statement: string; objective: string; scope: string; expected_deliverables: string; category_name: string; difficulty: string; payment_type: string; proposed_compensation_amount: number | null; estimated_duration_days: number | null; published_at: string; business_name: string; business_description: string; business_verified: boolean; roles: { title: string; description: string; slotCount: number; requiredSkills: string[]; preferredSkills: string[] }[] };

export default async function PublicProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || slug.length > 120) notFound();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("project_marketplace", { p_q: null, p_category: null, p_difficulty: null, p_payment: null, p_skill: null, p_slug: slug, p_limit: 1, p_offset: 0 });
  const project = ((data ?? []) as Detail[])[0];
  if (!project) notFound();
  return <main className="marketplace-page"><header className="site-header"><Link className="wordmark" href="/">SkillBridge</Link><nav className="header-actions"><Link className="text-link" href="/projects">Semua project</Link><Link className="text-link" href="/login">Masuk</Link></nav></header>
    <article className="public-project-detail"><p className="eyebrow">{project.category_name} · {project.difficulty}</p><h1>{project.title}</h1>
      <p className="project-business">{project.business_name} <span aria-label="Business terverifikasi">✓ Verified</span></p>{project.business_description && <p className="muted">{project.business_description}</p>}
      <p><strong>{project.payment_type}</strong>{project.payment_type === "PAID" && project.proposed_compensation_amount ? ` · Usulan yang diiklankan Rp ${project.proposed_compensation_amount.toLocaleString("id-ID")}` : ""}{project.estimated_duration_days ? ` · Estimasi ${project.estimated_duration_days} hari` : ""}</p>
      <Section title="Masalah" value={project.problem_statement}/><Section title="Tujuan" value={project.objective}/><Section title="Lingkup" value={project.scope}/><Section title="Hasil yang diharapkan" value={project.expected_deliverables}/>
      <h2>Project roles</h2>{project.roles.map((role,index) => <section className="review-card" key={`${role.title}-${index}`}><h3>{role.title} · {role.slotCount} slots</h3><p>{role.description}</p><p><strong>Required skills:</strong> {role.requiredSkills.join(", ")}</p><p><strong>Preferred skills:</strong> {role.preferredSkills.join(", ") || "Tidak ada"}</p></section>)}
      <p className="muted">Dipublikasikan {new Date(project.published_at).toLocaleDateString("id-ID")}. Project ini telah melalui moderation Admin.</p>
      <div className="hero-actions"><Link className="button button-primary button-link" href="/login">Login untuk melihat dashboard</Link></div>
    </article>
  </main>;
}

function Section({ title, value }: { title: string; value: string }) { return <section><h2>{title}</h2><p className="preserve-lines">{value}</p></section>; }
