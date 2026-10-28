import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInstitution, decideBusinessVerification, decideStudentVerification } from "@/features/identity/actions";
import { verificationStatusLabel } from "@/lib/status-labels";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type StudentReviewRow = { attempt_id: string; attempt_number: number; submitted_at: string; student_name: string; student_type: string; date_of_birth: string; institution_name: string; identity_type: string; identity_value: string; education_label: string; status: string };
type BusinessReviewRow = { attempt_id: string; attempt_number: number; submitted_at: string; business_name: string; category: string; nib: string | null; evidence_description: string; status: string };
type HistoryRow = { id: string; verification_id: string; attempt_number: number; status: string; reviewed_at: string | null; reason: string | null };
type InstitutionRow = { id: string; type: string; name: string; city_regency: string | null; province: string | null };

const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

function formatDate(value: string | null) {
  if (!value) return "Waktu belum tersedia";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Waktu belum tersedia" : dateTime.format(date);
}

function statusTone(status: string) {
  if (status === "VERIFIED") return "is-success";
  if (status === "REJECTED") return "is-danger";
  if (status === "REQUEST_REVISION" || status === "REVISION_REQUESTED") return "is-warning";
  return "is-pending";
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("ADMIN");
  const supabase = await createSupabaseServerClient();
  const [{ data: students }, { data: businesses }, { data: institutions }] = await Promise.all([
    supabase.rpc("admin_student_verification_queue"),
    supabase.rpc("admin_business_verification_queue"),
    supabase.from("institutions").select("id,type,name,city_regency,province").order("name"),
  ]);
  const studentRows = (students ?? []) as StudentReviewRow[];
  const businessRows = (businesses ?? []) as BusinessReviewRow[];
  const institutionRows = (institutions ?? []) as InstitutionRow[];
  const studentIds = studentRows.map((item) => item.attempt_id);
  const businessIds = businessRows.map((item) => item.attempt_id);
  const [{ data: studentEvidence }, { data: businessEvidence }, params] = await Promise.all([
    studentIds.length ? supabase.from("student_verification_evidence").select("id,attempt_id,original_filename").in("attempt_id", studentIds) : Promise.resolve({ data: [] }),
    businessIds.length ? supabase.from("business_verification_evidence").select("id,attempt_id,original_filename").in("attempt_id", businessIds) : Promise.resolve({ data: [] }),
    searchParams,
  ]);
  const [{ data: studentHistory }, { data: businessHistory }] = await Promise.all([
    supabase.from("student_verification_attempts").select("id,verification_id,attempt_number,status,reviewed_at,reason").in("status", ["VERIFIED", "REJECTED"]).order("reviewed_at", { ascending: false }).limit(20),
    supabase.from("business_verification_attempts").select("id,verification_id,attempt_number,status,reviewed_at,reason").in("status", ["VERIFIED", "REQUEST_REVISION", "REJECTED"]).order("reviewed_at", { ascending: false }).limit(20),
  ]);
  const studentDecisions = (studentHistory ?? []) as HistoryRow[];
  const businessDecisions = (businessHistory ?? []) as HistoryRow[];
  const studentVerificationIds = [...new Set(studentDecisions.map((item) => item.verification_id))];
  const businessVerificationIds = [...new Set(businessDecisions.map((item) => item.verification_id))];
  const [{ data: studentVerifications }, { data: businessVerifications }] = await Promise.all([
    studentVerificationIds.length ? supabase.from("student_verifications").select("id,student_id").in("id", studentVerificationIds) : Promise.resolve({ data: [] }),
    businessVerificationIds.length ? supabase.from("business_verifications").select("id,business_id").in("id", businessVerificationIds) : Promise.resolve({ data: [] }),
  ]);
  const studentProfileIds = (studentVerifications ?? []).map((item) => item.student_id);
  const businessProfileIds = (businessVerifications ?? []).map((item) => item.business_id);
  const [{ data: studentProfiles }, { data: businessProfiles }] = await Promise.all([
    studentProfileIds.length ? supabase.from("student_profiles").select("id,display_name").in("id", studentProfileIds) : Promise.resolve({ data: [] }),
    businessProfileIds.length ? supabase.from("business_profiles").select("id,business_name").in("id", businessProfileIds) : Promise.resolve({ data: [] }),
  ]);
  const studentNames = new Map((studentVerifications ?? []).map((verification) => [verification.id, studentProfiles?.find((profile) => profile.id === verification.student_id)?.display_name ?? "Mahasiswa"]));
  const businessNames = new Map((businessVerifications ?? []).map((verification) => [verification.id, businessProfiles?.find((profile) => profile.id === verification.business_id)?.business_name ?? "UMKM"]));
  const pendingCount = studentRows.length + businessRows.length;

  return <div className="admin-dashboard">
    <header className="admin-page-heading">
      <div>
        <p className="eyebrow">Panel Admin</p>
        <h1>Verifikasi akun</h1>
        <p className="muted">Tinjau identitas mahasiswa dan dokumen usaha, lalu pilih keputusan untuk setiap pengajuan.</p>
      </div>
      <Link className="button button-primary button-link" href="/admin/project-review">Review project</Link>
    </header>

    {params.error && <p className="notice notice-error">Aksi gagal. Periksa data pengajuan dan alasan keputusan.</p>}
    {params.updated && <p className="notice notice-success">Keputusan berhasil disimpan.</p>}
    {params.institution && <p className="notice notice-success">Institusi berhasil ditambahkan.</p>}

    <section className="admin-summary-grid" aria-label="Ringkasan verifikasi">
      <article className="admin-summary-card admin-summary-primary"><span>Perlu ditinjau</span><strong>{pendingCount}</strong><small>Total antrean mahasiswa dan usaha</small></article>
      <article className="admin-summary-card"><span>Mahasiswa</span><strong>{studentRows.length}</strong><small>Pengajuan menunggu pemeriksaan</small></article>
      <article className="admin-summary-card"><span>Usaha</span><strong>{businessRows.length}</strong><small>Pengajuan menunggu pemeriksaan</small></article>
      <article className="admin-summary-card"><span>Institusi terdaftar</span><strong>{institutionRows.length}</strong><small>Universitas dan SMK</small></article>
    </section>

    <section className="admin-panel" aria-labelledby="student-queue-title">
      <div className="admin-section-heading">
        <div><p className="eyebrow">Langkah 1</p><h2 id="student-queue-title">Antrean mahasiswa</h2><p className="muted">Periksa identitas dan bukti sebelum menyetujui atau menolak.</p></div>
        <span className="admin-count-pill">{studentRows.length} pengajuan</span>
      </div>
      {!studentRows.length && <EmptyState title="Belum ada pengajuan mahasiswa" description="Pengajuan verifikasi baru akan muncul di sini setelah mahasiswa mengirim datanya."/>}
      <div className="admin-review-grid">
        {studentRows.map((item) => <article className="admin-review-card" key={item.attempt_id}>
          <div className="admin-review-heading">
            <div><p className="eyebrow">Pengajuan #{item.attempt_number}</p><h3>{item.student_name}</h3></div>
            <span className={`admin-status-pill ${statusTone(item.status)}`}>{verificationStatusLabel(item.status)}</span>
          </div>
          <dl className="admin-detail-grid">
            <Detail label="Jenis peserta">{item.student_type === "COLLEGE" ? "Mahasiswa" : item.student_type === "VOCATIONAL_SCHOOL" ? "Siswa SMK" : item.student_type}</Detail>
            <Detail label="Institusi">{item.institution_name}</Detail>
            <Detail label="Pendidikan">{item.education_label}</Detail>
            <Detail label="Tanggal pengajuan">{formatDate(item.submitted_at)}</Detail>
            <Detail label="Tanggal lahir (privat)">{item.date_of_birth}</Detail>
            <Detail label={`Nomor ${item.identity_type}`} emphasize>{item.identity_value}</Detail>
          </dl>
          <Evidence evidence={studentEvidence?.filter((ev) => ev.attempt_id === item.attempt_id) ?? []} kind="student"/>
          <form action={decideStudentVerification} className="admin-decision-form">
            <input type="hidden" name="attemptId" value={item.attempt_id}/>
            <label className="field">Catatan keputusan<textarea name="reason" maxLength={1200} placeholder="Wajib diisi jika pengajuan ditolak."/><small>Isi alasan yang jelas agar pemohon memahami hasil pemeriksaan.</small></label>
            <div className="form-actions"><PendingSubmitButton name="decision" value="VERIFIED" pendingLabel="Menyimpan keputusan...">Setujui verifikasi</PendingSubmitButton><PendingSubmitButton className="button button-secondary" name="decision" value="REJECTED" pendingLabel="Menyimpan keputusan...">Tolak pengajuan</PendingSubmitButton></div>
          </form>
        </article>)}
      </div>
    </section>

    <section className="admin-panel" aria-labelledby="business-queue-title">
      <div className="admin-section-heading">
        <div><p className="eyebrow">Langkah 2</p><h2 id="business-queue-title">Antrean usaha</h2><p className="muted">Periksa profil dan dokumen pendukung usaha.</p></div>
        <span className="admin-count-pill">{businessRows.length} pengajuan</span>
      </div>
      {!businessRows.length && <EmptyState title="Belum ada pengajuan usaha" description="Pengajuan verifikasi dari akun UMKM akan muncul di bagian ini."/>}
      <div className="admin-review-grid">
        {businessRows.map((item) => <article className="admin-review-card" key={item.attempt_id}>
          <div className="admin-review-heading">
            <div><p className="eyebrow">Pengajuan #{item.attempt_number}</p><h3>{item.business_name}</h3></div>
            <span className={`admin-status-pill ${statusTone(item.status)}`}>{verificationStatusLabel(item.status)}</span>
          </div>
          <dl className="admin-detail-grid">
            <Detail label="Kategori usaha">{item.category}</Detail>
            <Detail label="NIB">{item.nib || "Belum dicantumkan"}</Detail>
            <Detail label="Tanggal pengajuan">{formatDate(item.submitted_at)}</Detail>
            <Detail label="Keterangan bukti" wide>{item.evidence_description}</Detail>
          </dl>
          <Evidence evidence={businessEvidence?.filter((ev) => ev.attempt_id === item.attempt_id) ?? []} kind="business"/>
          <form action={decideBusinessVerification} className="admin-decision-form">
            <input type="hidden" name="attemptId" value={item.attempt_id}/>
            <label className="field">Catatan keputusan<textarea name="reason" maxLength={1200} placeholder="Wajib diisi jika meminta perbaikan atau menolak."/><small>Jelaskan dokumen atau informasi yang perlu diperbaiki.</small></label>
            <div className="form-actions"><PendingSubmitButton name="decision" value="VERIFIED" pendingLabel="Menyimpan keputusan...">Setujui verifikasi</PendingSubmitButton><PendingSubmitButton className="button button-secondary" name="decision" value="REQUEST_REVISION" pendingLabel="Menyimpan keputusan...">Minta perbaikan</PendingSubmitButton><PendingSubmitButton className="button button-secondary" name="decision" value="REJECTED" pendingLabel="Menyimpan keputusan...">Tolak pengajuan</PendingSubmitButton></div>
          </form>
        </article>)}
      </div>
    </section>

    <section className="admin-panel" aria-labelledby="student-history-title">
      <div className="admin-section-heading"><div><p className="eyebrow">Riwayat</p><h2 id="student-history-title">Keputusan mahasiswa terbaru</h2><p className="muted">Catatan keputusan terbaru untuk pengajuan mahasiswa.</p></div></div>
      {!studentDecisions.length && <EmptyState title="Belum ada keputusan" description="Keputusan yang sudah disimpan akan tercatat di sini."/>}
      <div className="admin-history-grid">{studentDecisions.map((item) => <HistoryCard key={item.id} item={item} subject={studentNames.get(item.verification_id) ?? "Mahasiswa"}/>)}</div>
    </section>

    <section className="admin-panel" aria-labelledby="business-history-title">
      <div className="admin-section-heading"><div><p className="eyebrow">Riwayat</p><h2 id="business-history-title">Keputusan usaha terbaru</h2><p className="muted">Catatan keputusan terbaru untuk pengajuan usaha.</p></div></div>
      {!businessDecisions.length && <EmptyState title="Belum ada keputusan" description="Keputusan yang sudah disimpan akan tercatat di sini."/>}
      <div className="admin-history-grid">{businessDecisions.map((item) => <HistoryCard key={item.id} item={item} subject={businessNames.get(item.verification_id) ?? "UMKM"}/>)}</div>
    </section>

    <section className="admin-panel" aria-labelledby="institutions-title">
      <div className="admin-section-heading"><div><p className="eyebrow">Data pendukung</p><h2 id="institutions-title">Institusi pendidikan</h2><p className="muted">Tambahkan kampus atau SMK yang akan dipilih saat mahasiswa mengisi profil.</p></div><span className="admin-count-pill">{institutionRows.length} institusi</span></div>
      <div className="admin-institution-layout">
        <form action={createInstitution} className="admin-institution-form">
          <h3>Tambah institusi</h3>
          <label className="field">Jenis institusi<select name="type"><option value="UNIVERSITY">Universitas/perguruan tinggi</option><option value="VOCATIONAL_SCHOOL">SMK</option></select></label>
          <label className="field">Nama institusi<input name="name" minLength={2} maxLength={180} required placeholder="Contoh: Universitas Indonesia"/></label>
          <label className="field">Kota/Kabupaten<input name="city" maxLength={120} placeholder="Contoh: Depok"/></label>
          <label className="field">Provinsi<input name="province" maxLength={120} placeholder="Contoh: Jawa Barat"/></label>
          <button className="button button-primary">Simpan institusi</button>
        </form>
        <div className="admin-institution-list">
          <h3>Daftar institusi</h3>
          {!institutionRows.length && <p className="muted">Belum ada institusi yang ditambahkan.</p>}
          {institutionRows.map((item) => <article className="admin-institution-card" key={item.id}>
            <span className="admin-institution-icon" aria-hidden="true">{item.type === "UNIVERSITY" ? "PT" : "SMK"}</span>
            <div><strong>{item.name}</strong><p>{item.type === "UNIVERSITY" ? "Universitas/perguruan tinggi" : item.type === "VOCATIONAL_SCHOOL" ? "Sekolah menengah kejuruan" : item.type}{item.city_regency ? ` · ${item.city_regency}` : ""}{item.province ? `, ${item.province}` : ""}</p></div>
          </article>)}
        </div>
      </div>
    </section>
  </div>;
}

function Detail({ label, children, wide = false, emphasize = false }: { label: string; children: React.ReactNode; wide?: boolean; emphasize?: boolean }) {
  return <div className={`admin-detail${wide ? " is-wide" : ""}`}><dt>{label}</dt><dd className={emphasize ? "is-emphasized" : undefined}>{children}</dd></div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="admin-empty-state"><span aria-hidden="true">✓</span><div><strong>{title}</strong><p>{description}</p></div></div>;
}

function Evidence({ evidence, kind }: { evidence: { id: string; original_filename: string }[]; kind: "student" | "business" }) {
  if (!evidence.length) return <div className="admin-evidence admin-evidence-empty"><strong>Bukti belum tersedia</strong><p>Periksa keterangan pengajuan sebelum mengambil keputusan.</p></div>;
  return <div className="admin-evidence"><div><strong>Dokumen pendukung</strong><span>{evidence.length} file</span></div><ul>{evidence.map((item) => <li key={item.id}><a href={`/admin/evidence/${kind}/${item.id}`} rel="noreferrer">Buka file privat: {item.original_filename}<span aria-hidden="true">↗</span></a></li>)}</ul></div>;
}

function HistoryCard({ item, subject }: { item: HistoryRow; subject: string }) {
  return <article className="admin-history-card">
    <div className="admin-review-heading"><div><p className="eyebrow">{subject} · Pengajuan #{item.attempt_number}</p><strong>{verificationStatusLabel(item.status)}</strong></div><span className={`admin-status-pill ${statusTone(item.status)}`}>{verificationStatusLabel(item.status)}</span></div>
    <p className="admin-history-date">Diputuskan {formatDate(item.reviewed_at)}</p>
    {item.reason && <p className="admin-history-reason">{item.reason}</p>}
  </article>;
}
