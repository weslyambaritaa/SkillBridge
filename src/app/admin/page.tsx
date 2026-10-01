import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInstitution, decideBusinessVerification, decideStudentVerification } from "@/features/identity/actions";

type StudentReviewRow = { attempt_id: string; attempt_number: number; submitted_at: string; student_name: string; student_type: string; date_of_birth: string; institution_name: string; identity_type: string; identity_value: string; education_label: string; status: string };
type BusinessReviewRow = { attempt_id: string; attempt_number: number; submitted_at: string; business_name: string; category: string; nib: string | null; evidence_description: string; status: string };

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
  const studentIds = studentRows.map((item) => item.attempt_id);
  const businessIds = businessRows.map((item) => item.attempt_id);
  const [{ data: studentEvidence }, { data: businessEvidence }, params] = await Promise.all([
    studentIds.length ? supabase.from("student_verification_evidence").select("id,attempt_id,original_filename").in("attempt_id", studentIds) : Promise.resolve({ data: [] }),
    businessIds.length ? supabase.from("business_verification_evidence").select("id,attempt_id,original_filename").in("attempt_id", businessIds) : Promise.resolve({ data: [] }),
    searchParams,
  ]);
  const [{ data: studentHistory }, { data: businessHistory }] = await Promise.all([
    supabase.from("student_verification_attempts").select("id,attempt_number,status,reviewed_at,reason").in("status", ["VERIFIED", "REJECTED"]).order("reviewed_at", { ascending: false }).limit(20),
    supabase.from("business_verification_attempts").select("id,attempt_number,status,reviewed_at,reason").in("status", ["VERIFIED", "REQUEST_REVISION", "REJECTED"]).order("reviewed_at", { ascending: false }).limit(20),
  ]);

  return <section className="dashboard-card form-stack">
    <p className="eyebrow">Governance</p><h1>Verification review</h1>
    <p className="muted">Hanya Admin yang dapat mengakses identitas mahasiswa dan bukti verifikasi pada antrean ini.</p>
    <Link className="button button-primary button-link" href="/admin/project-review">Buka antrean project</Link>
    {params.error && <p className="notice notice-error">Aksi gagal. Periksa antrean, alasan, dan data institusi.</p>}
    {params.updated && <p className="notice notice-success">Keputusan tersimpan dalam riwayat attempt.</p>}
    {params.institution && <p className="notice notice-success">Institusi berhasil ditambahkan.</p>}

    <h2>Antrean verifikasi student</h2>
    {!studentRows.length && <p className="muted">Tidak ada antrean student.</p>}
    {studentRows.map((item) => <article className="review-card" key={item.attempt_id}>
      <p className="eyebrow">Attempt {item.attempt_number} · {item.status}</p><h3>{item.student_name}</h3>
      <p>{item.student_type} · {item.institution_name} · {item.education_label}</p>
      <p>Tanggal lahir (data privat untuk review): {item.date_of_birth}</p>
      <p>Identitas {item.identity_type}: <strong>{item.identity_value}</strong></p>
      <p className="muted">Data identitas ini hanya ditampilkan dalam sesi review Admin.</p>
      <Evidence evidence={studentEvidence?.filter((ev) => ev.attempt_id === item.attempt_id) ?? []} kind="student"/>
      <form action={decideStudentVerification} className="form-stack"><input type="hidden" name="attemptId" value={item.attempt_id}/><label className="field">Alasan (wajib untuk reject)<textarea name="reason" maxLength={1200}/></label><div className="form-actions"><button className="button button-primary" name="decision" value="VERIFIED">Approve</button><button className="button button-secondary" name="decision" value="REJECTED">Reject</button></div></form>
    </article>)}

    <h2>Antrean verifikasi usaha</h2>
    {!businessRows.length && <p className="muted">Tidak ada antrean usaha.</p>}
    {businessRows.map((item) => <article className="review-card" key={item.attempt_id}>
      <p className="eyebrow">Attempt {item.attempt_number} · {item.status}</p><h3>{item.business_name}</h3>
      <p>{item.category}{item.nib ? ` · NIB ${item.nib}` : ""}</p><p>{item.evidence_description}</p>
      <Evidence evidence={businessEvidence?.filter((ev) => ev.attempt_id === item.attempt_id) ?? []} kind="business"/>
      <form action={decideBusinessVerification} className="form-stack"><input type="hidden" name="attemptId" value={item.attempt_id}/><label className="field">Alasan (wajib untuk revisi/reject)<textarea name="reason" maxLength={1200}/></label><div className="form-actions"><button className="button button-primary" name="decision" value="VERIFIED">Approve</button><button className="button button-secondary" name="decision" value="REQUEST_REVISION">Request revision</button><button className="button button-secondary" name="decision" value="REJECTED">Reject</button></div></form>
    </article>)}

    <h2>Keputusan student terbaru</h2>
    <ul>{((studentHistory ?? []) as { id: string; attempt_number: number; status: string; reviewed_at: string; reason: string | null }[]).map((item) => <li key={item.id}>Attempt #{item.attempt_number} · {item.status} · {item.reviewed_at}{item.reason ? ` · ${item.reason}` : ""}</li>)}</ul>
    <h2>Keputusan usaha terbaru</h2>
    <ul>{((businessHistory ?? []) as { id: string; attempt_number: number; status: string; reviewed_at: string; reason: string | null }[]).map((item) => <li key={item.id}>Attempt #{item.attempt_number} · {item.status} · {item.reviewed_at}{item.reason ? ` · ${item.reason}` : ""}</li>)}</ul>

    <h2>Institusi ({institutions?.length ?? 0})</h2>
    <p className="muted">Pembuatan institusi dibatasi ke Admin. Nama yang sama per jenis institusi ditolak oleh constraint database.</p>
    <form action={createInstitution} className="form-stack"><label className="field">Jenis<select name="type"><option value="UNIVERSITY">Universitas/perguruan tinggi</option><option value="VOCATIONAL_SCHOOL">SMK</option></select></label><label className="field">Nama<input name="name" minLength={2} maxLength={180} required/></label><label className="field">Kota/Kabupaten<input name="city" maxLength={120}/></label><label className="field">Provinsi<input name="province" maxLength={120}/></label><button className="button button-secondary">Tambah institusi</button></form>
    <ul className="institution-list">{(institutions ?? []).map((item) => <li key={item.id}>{item.name} · {item.type}{item.city_regency ? ` · ${item.city_regency}` : ""}</li>)}</ul>
  </section>;
}

function Evidence({ evidence, kind }: { evidence: { id: string; original_filename: string }[]; kind: "student" | "business" }) {
  if (!evidence.length) return <p className="muted">Tidak ada file. Buka deskripsi bukti dan keputusan sesuai kebijakan.</p>;
  return <ul>{evidence.map((item) => <li key={item.id}><a href={`/admin/evidence/${kind}/${item.id}`} rel="noreferrer">Buka bukti privat: {item.original_filename}</a></li>)}</ul>;
}
