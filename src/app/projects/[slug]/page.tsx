import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAccount } from "@/features/auth/data";
import { dashboardPathForRole } from "@/features/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyToProject } from "@/features/applications/actions";
import { projectDifficultyLabel, projectPaymentLabel } from "@/lib/status-labels";

type Detail = { project_slug: string; title: string; problem_statement: string; objective: string; scope: string; expected_deliverables: string; category_name: string; difficulty: string; payment_type: string; proposed_compensation_amount: number | null; estimated_duration_days: number | null; published_at: string; business_name: string; business_description: string; business_verified: boolean; roles: { id?: string; title: string; description: string; slotCount: number; requiredSkills: string[]; preferredSkills: string[] }[] };

const applicationErrors: Record<string, string> = {
  validation: "Pilih role dan tulis alasan melamar sepanjang 20–1000 karakter.",
  duplicate: "Anda sudah melamar ke proyek ini. Lihat statusnya di Lamaran saya.",
  on_project: "Anda sedang aktif di proyek lain. Selesaikan proyek tersebut sebelum melamar lagi.",
  eligibility: "Selesaikan verifikasi Student dan persetujuan wali bila diperlukan.",
  cv: "Lampirkan CV PDF yang valid, maksimal 5 MB.",
  upload: "CV gagal diunggah. Coba lagi beberapa saat.",
  closed: "Proyek tidak lagi menerima lamaran.",
  failed: "Lamaran belum dapat dikirim. Coba lagi setelah memuat ulang halaman.",
};

export default async function PublicProjectDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ application_error?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || slug.length > 120) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data }, account] = await Promise.all([
    supabase.rpc("project_marketplace", { p_q: null, p_category: null, p_difficulty: null, p_payment: null, p_skill: null, p_slug: slug, p_limit: 1, p_offset: 0 }),
    getCurrentAccount(),
  ]);
  const project = ((data ?? []) as Detail[])[0];
  if (!project) notFound();
  return <div className="marketplace-page marketplace-detail-page">
    <Link className="marketplace-back" href="/projects">← Kembali ke semua project</Link>
    <article className="public-project-detail"><p className="eyebrow">{project.category_name} · {projectDifficultyLabel(project.difficulty)}</p><h1>{project.title}</h1>
      <p className="project-business">{project.business_name} <span aria-label="Business terverifikasi">✓ Verified</span></p>{project.business_description && <p className="muted">{project.business_description}</p>}
      <p><strong>{projectPaymentLabel(project.payment_type)}</strong>{project.payment_type === "PAID" && project.proposed_compensation_amount ? ` · Usulan yang diiklankan Rp ${project.proposed_compensation_amount.toLocaleString("id-ID")}` : ""}{project.estimated_duration_days ? ` · Estimasi ${project.estimated_duration_days} hari` : ""}</p>
      <Section title="Masalah" value={project.problem_statement}/><Section title="Tujuan" value={project.objective}/><Section title="Lingkup" value={project.scope}/><Section title="Hasil yang diharapkan" value={project.expected_deliverables}/>
      <h2>Project roles</h2>{project.roles.map((role,index) => <section className="review-card" key={`${role.title}-${index}`}><h3>{role.title} · {role.slotCount} slots</h3><p>{role.description}</p><p><strong>Required skills:</strong> {role.requiredSkills.join(", ")}</p><p><strong>Preferred skills:</strong> {role.preferredSkills.join(", ") || "Tidak ada"}</p></section>)}
      <p className="muted">Dipublikasikan {new Date(project.published_at).toLocaleDateString("id-ID")}. Project ini telah melalui moderation Admin.</p>
      <div className="hero-actions"><Link className="button button-primary button-link" href={account ? dashboardPathForRole(account.role) : "/login"}>{account ? "Kembali ke dashboard" : "Login untuk melihat dashboard"}</Link></div>
      {query.application_error && <p className="notice notice-error">{applicationErrors[query.application_error] ?? applicationErrors.failed}</p>}
      {account?.role === "STUDENT" && <section className="form-stack"><h2>Lamar proyek</h2>
        {project.roles.map((role, index) => role.id ? <form action={applyToProject} className="review-card form-stack" key={role.id}>
          <h3>{role.title}</h3><input type="hidden" name="projectSlug" value={slug}/><input type="hidden" name="projectRoleId" value={role.id}/>
          <label className="field">Alasan melamar<textarea name="message" minLength={20} maxLength={1000} required placeholder="Ceritakan pengalaman dan alasan Anda cocok untuk role ini."/></label>
          <label className="field">CV (PDF, maksimal 5 MB)<input type="file" name="cv" accept="application/pdf,.pdf" required/></label>
          <button className="button button-primary" type="submit">Lamar role ini</button>
        </form> : <p className="notice notice-error" key={`${role.title}-${index}`}>Fitur lamaran belum tersedia. Jalankan migration lamaran terbaru terlebih dahulu.</p>)}
      </section>}
      {!account && <p><Link className="text-link" href="/login">Masuk sebagai Student untuk melamar proyek.</Link></p>}
    </article>
  </div>;
}

function Section({ title, value }: { title: string; value: string }) { return <section><h2>{title}</h2><p className="preserve-lines">{value}</p></section>; }
