import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeProject, decideApplication } from "@/features/applications/actions";
import { applicationStatusLabel } from "@/lib/status-labels";

type Application = {
  application_id: string;
  role_title: string;
  student_name: string;
  student_bio: string | null;
  application_message: string;
  cv_original_filename: string | null;
  application_status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "CLOSED";
  applied_at: string;
};

const errors: Record<string, string> = {
  full: "Slot role sudah penuh.",
  on_project: "Student ini sudah aktif pada proyek lain.",
  eligibility: "Student tidak lagi memenuhi syarat verifikasi atau persetujuan wali.",
  decided: "Lamaran ini sudah diputuskan. Muat ulang halaman.",
  closed: "Proyek sudah ditutup.",
  complete: "Proyek belum dapat diselesaikan. Pastikan ada Student yang diterima dan proyek masih aktif.",
  validation: "Aksi tidak valid.",
  failed: "Aksi gagal. Muat ulang halaman dan coba kembali.",
};

export default async function BusinessProjectApplicationsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; decided?: string; completed?: string }>;
}) {
  await requireRole("BUSINESS");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data: project }, { data, error }, { data: execution, error: executionError }, query] = await Promise.all([
    supabase.rpc("business_get_project", { p_project_id: id }),
    supabase.rpc("business_list_project_applications", { p_project_id: id }),
    supabase.rpc("business_project_execution", { p_project_id: id }),
    searchParams,
  ]);
  if (!project) notFound();
  const applications = (data ?? []) as Application[];
  const activeCount = applications.filter((application) => application.application_status === "ACCEPTED").length;
  const executionStatus = (execution as string | null) ?? "OPEN";

  return <section className="dashboard-card form-stack">
    <p className="eyebrow">UMKM · Lamaran</p><h1>{(project as { title: string }).title}</h1>
    <p className="status-panel"><strong>Status pengerjaan:</strong> {executionStatus === "ACTIVE" ? "Sedang berjalan" : executionStatus === "COMPLETED" ? "Selesai" : "Belum dimulai"} · <strong>Student aktif:</strong> {activeCount}</p>
    {query.error && <p className="notice notice-error">{errors[query.error] ?? errors.failed}</p>}
    {query.decided && <p className="notice notice-success">Keputusan lamaran tersimpan.</p>}
    {query.completed && <p className="notice notice-success">Proyek selesai. Student dapat melamar proyek baru.</p>}
    {(error || executionError) && <p className="notice notice-error">Data lamaran belum tersedia. Pastikan migration lamaran sudah dijalankan.</p>}
    <Link className="text-link" href={`/business/projects/${id}`}>Kembali ke proyek</Link>
    {!error && !applications.length && <p className="muted">Belum ada lamaran untuk proyek ini.</p>}
    {applications.map((application) => <article className="review-card" key={application.application_id}>
      <h2>{application.student_name} · {application.role_title}</h2>
      {application.student_bio && <p className="muted">{application.student_bio}</p>}
      <p className="preserve-lines">{application.application_message}</p>
      {application.cv_original_filename ? <p><strong>CV:</strong> <Link className="text-link" href={`/business/applications/${application.application_id}/cv`}>Unduh {application.cv_original_filename}</Link></p> : <p className="muted">CV belum tersedia untuk lamaran lama ini.</p>}
      <p><span className={`application-status application-status-${application.application_status.toLowerCase()}`}>{applicationStatusLabel(application.application_status)}</span> · Dikirim {new Date(application.applied_at).toLocaleString("id-ID")}</p>
      {application.application_status === "PENDING" && executionStatus !== "COMPLETED" && <form action={decideApplication} className="form-actions">
        <input type="hidden" name="projectId" value={id}/>
        <input type="hidden" name="applicationId" value={application.application_id}/>
        <button className="button button-primary" name="decision" value="ACCEPTED">Terima Student</button>
        <button className="button button-secondary" name="decision" value="REJECTED">Tolak</button>
      </form>}
    </article>)}
    {executionStatus === "ACTIVE" && activeCount > 0 && <form action={completeProject} className="form-stack status-panel">
      <h2>Selesaikan proyek</h2>
      <p>UMKM menyetujui bahwa proyek selesai. Semua Student yang diterima akan berstatus selesai dan siap melamar proyek baru; lamaran yang masih menunggu akan ditutup.</p>
      <input type="hidden" name="projectId" value={id}/>
      <label><input type="checkbox" name="confirm" value="yes" required/> Saya menyetujui penyelesaian proyek ini.</label>
      <button className="button button-primary" type="submit">Setujui dan selesaikan proyek</button>
    </form>}
  </section>;
}
