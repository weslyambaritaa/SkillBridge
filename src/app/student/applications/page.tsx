import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { studentEligibleForApply } from "@/features/identity/domain";
import { applicationStatusLabel } from "@/lib/status-labels";

type Application = {
  application_id: string;
  project_title: string;
  role_title: string;
  business_name: string;
  application_status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "CLOSED";
  applied_at: string;
  decided_at: string | null;
  completed_at: string | null;
  cv_original_filename: string | null;
};

export default async function StudentApplicationsPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; cv_attached?: string }> }) {
  await requireRole("STUDENT");
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: verification }, { data: consentState }, params] = await Promise.all([
    supabase.rpc("student_list_applications"),
    supabase.from("student_verifications").select("status").maybeSingle(),
    supabase.rpc("student_guardian_consent_status"),
    searchParams,
  ]);
  const applications = (data ?? []) as Application[];
  const onProject = applications.some((application) => application.application_status === "ACCEPTED");
  const completed = applications.some((application) => application.application_status === "COMPLETED");
  const consent = Array.isArray(consentState) ? consentState[0] : null;
  const eligible = studentEligibleForApply(verification?.status ?? "UNVERIFIED", Boolean(consent?.is_minor), consent?.consent_status ?? null);

  return <section className="dashboard-card form-stack applications-page">
    <div className="applications-intro"><div><p className="eyebrow">Ruang student</p><h1>Lamaran saya</h1><p className="muted">Pantau setiap lamaran dan langkah berikutnya dari satu tempat.</p></div><Link className="button button-primary" href="/projects">Jelajahi project ↗</Link></div>
    {params.sent && <p className="notice notice-success">Lamaran berhasil dikirim. Tunggu keputusan UMKM.</p>}
    {params.cv_attached && <p className="notice notice-success">CV berhasil dilampirkan ke lamaran.</p>}
    {params.error === "closed" && <p className="notice notice-error">Proyek sudah ditutup untuk lamaran. Pilih proyek lain yang masih tersedia.</p>}
    {params.error === "cv" && <p className="notice notice-error">Pilih CV PDF yang valid, maksimal 5 MB.</p>}
    {params.error === "cv_upload" && <p className="notice notice-error">CV belum dapat dilampirkan. Pastikan lamaran masih terbuka, lalu coba lagi.</p>}
    {error && <p className="notice notice-error">Riwayat lamaran belum dapat dimuat. Pastikan migration lamaran sudah dijalankan.</p>}
    {!error && <div className="applications-overview"><span className="applications-overview-icon" aria-hidden="true">↗</span><div><span>Status project saat ini</span><strong>{onProject ? "Sedang mengerjakan project" : eligible ? completed ? "Siap melamar project baru" : "Siap melamar" : "Lengkapi verifikasi untuk melamar"}</strong></div><span className="applications-count">{applications.length} lamaran</span></div>}
    {!error && !applications.length && <div className="project-empty"><h2>Belum ada lamaran</h2><p className="muted">Temukan project yang cocok, lalu kirim lamaran pertamamu.</p><Link className="button button-secondary" href="/projects">Lihat project</Link></div>}
    {applications.map((application) => <article className="review-card" key={application.application_id}>
      <div className="application-card-head"><div><p className="eyebrow">{application.business_name}</p><h2>{application.project_title}</h2><p className="muted">Posisi: {application.role_title}</p></div><span className={`application-status application-status-${application.application_status.toLowerCase()}`}>{applicationStatusLabel(application.application_status)}</span></div>
      {application.cv_original_filename ? <p className="muted">CV terlampir: {application.cv_original_filename}</p> : ["PENDING", "ACCEPTED"].includes(application.application_status) ? <form action="/student/applications/cv" method="post" encType="multipart/form-data" className="form-stack">
        <input type="hidden" name="applicationId" value={application.application_id}/>
        <label className="field">Lampirkan CV untuk lamaran lama (PDF, maksimal 5 MB)<input type="file" name="cv" accept="application/pdf,.pdf" required/></label>
        <button className="button button-secondary" type="submit">Unggah CV</button>
      </form> : <p className="muted">CV tidak terlampir.</p>}
      <p className="application-date">Dikirim {new Date(application.applied_at).toLocaleString("id-ID")}</p>
    </article>)}
  </section>;
}
