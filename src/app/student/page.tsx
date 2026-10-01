import { cookies } from "next/headers";
import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { studentEligibleForApply } from "@/features/identity/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestGuardianConsent, saveStudentOnboarding, submitStudentVerification } from "@/features/identity/actions";

type Search = Promise<Record<string, string | string[] | undefined>>;
const message: Record<string, string> = {
  onboarding: "Data onboarding belum valid. Periksa kembali setiap kolom.", identity: "Identitas akademik telah digunakan atau tidak dapat disimpan.",
  save: "Profil belum dapat disimpan.", file: "Pilih PDF, JPG, PNG, atau WebP yang valid dengan ukuran maksimal 5 MB.",
  verification: "Verifikasi belum dapat dikirim. Pastikan onboarding selesai dan tidak ada attempt terbuka.",
  upload: "Bukti gagal diunggah. Periksa format dan coba lagi.", guardian: "Permintaan persetujuan wali gagal. Fitur ini hanya untuk siswa di bawah 18 tahun.",
};

export default async function StudentDashboard({ searchParams }: { searchParams: Search }) {
  await requireRole("STUDENT");
  const supabase = await createSupabaseServerClient();
  const [{ data: account }, { data: institutions }, { data: profile }, { data: verification }, { data: consentState }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("institutions").select("id,type,name,city_regency,province").order("name"),
    supabase.from("student_profiles").select("id,student_type,display_name,bio").maybeSingle(),
    supabase.from("student_verifications").select("id,status,current_attempt_id").maybeSingle(),
    supabase.rpc("student_guardian_consent_status"),
  ]);
  const [{ data: education }, { data: attempts }, { data: evidence }, { data: attemptHistory }] = await Promise.all([
    profile ? supabase.from("education_records").select("institution_id,study_program,semester,major,grade").eq("student_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    verification?.current_attempt_id ? supabase.from("student_verification_attempts").select("id,attempt_number,status,reason,submitted_at").eq("id", verification.current_attempt_id).maybeSingle() : Promise.resolve({ data: null }),
    verification?.current_attempt_id ? supabase.from("student_verification_evidence").select("storage_path,original_filename").eq("attempt_id", verification.current_attempt_id) : Promise.resolve({ data: [] }),
    verification?.id ? supabase.from("student_verification_attempts").select("attempt_number,status,reason").eq("verification_id", verification.id).order("attempt_number", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const params = await searchParams;
  const cookieStore = await cookies();
  const consentLink = params.guardianLink === "ready" ? cookieStore.get("skillbridge_guardian_link")?.value : undefined;
  const errorCode = typeof params.error === "string" ? params.error : "";
  const consent = Array.isArray(consentState) ? consentState[0] : null;
  const effectiveStatus = verification?.status ?? "UNVERIFIED";
  const eligible = studentEligibleForApply(effectiveStatus, Boolean(consent?.is_minor), consent?.consent_status ?? null);

  return <section className="dashboard-card form-stack">
    <p className="eyebrow">Ruang student</p><h1>Profil dan verifikasi</h1>
    <p className="muted">Identitas akademik dan tanggal lahir hanya diproses untuk verifikasi. Keduanya tidak tampil pada profil publik.</p>
    <Link className="button button-secondary button-link" href="/projects">Explore published projects</Link>
    {errorCode && <p className="notice notice-error">{message[errorCode] ?? "Permintaan tidak dapat diproses."}</p>}
    {params.saved && <p className="notice notice-success">Profil berhasil disimpan.</p>}
    {params.submitted && <p className="notice notice-success">Bukti terkirim untuk ditinjau Admin.</p>}
    {consentLink && <p className="notice notice-success">Bagikan tautan ini kepada wali: <a href={consentLink} rel="noreferrer">Buka tautan persetujuan</a></p>}
    <div className="status-panel"><strong>Status student:</strong> {effectiveStatus}<br/><strong>Kelayakan apply (untuk modul berikutnya):</strong> {eligible ? "Siap" : "Belum memenuhi syarat"}{attempts?.reason && <p>Catatan Admin: {attempts.reason}</p>}</div>
    {attemptHistory?.length ? <div><strong>Riwayat verification attempts</strong><ul>{attemptHistory.map((item) => <li key={item.attempt_number}>#{item.attempt_number} · {item.status}{item.reason ? ` · ${item.reason}` : ""}</li>)}</ul></div> : null}
    {evidence?.length ? <p className="muted">Bukti tersimpan secara privat: {evidence.map((item) => item.original_filename).join(", ")}</p> : null}

    <h2>{profile ? "Perbarui onboarding" : "Onboarding student"}</h2>
    {!institutions?.length && <p className="notice notice-error">Daftar institusi belum tersedia. Admin perlu menambahkan institusi terlebih dahulu.</p>}
    {institutions?.length ? <form action={saveStudentOnboarding} className="form-stack">
      <label className="field">Jenis student<select name="studentType" defaultValue={profile?.student_type ?? "COLLEGE"} required><option value="COLLEGE">Mahasiswa</option><option value="VOCATIONAL_SCHOOL">Siswa SMK</option></select></label>
      <label className="field">Nama tampilan<input name="displayName" defaultValue={profile?.display_name ?? account.user?.user_metadata?.full_name ?? ""} minLength={2} maxLength={100} required/></label>
      <label className="field">Bio profesional<textarea name="bio" defaultValue={profile?.bio ?? ""} maxLength={1200}/></label>
      <label className="field">Institusi<select name="institutionId" defaultValue={education?.institution_id ?? ""} required><option value="" disabled>Pilih institusi</option>{institutions.map((item) => <option key={item.id} value={item.id} data-type={item.type}>{item.name} · {item.type === "UNIVERSITY" ? "Universitas" : "SMK"}{item.city_regency ? ` · ${item.city_regency}` : ""}</option>)}</select><small>Pastikan memilih universitas untuk mahasiswa atau SMK untuk siswa.</small></label>
      <label className="field">Program studi (mahasiswa)<input name="studyProgram" defaultValue={education?.study_program ?? ""} maxLength={160}/></label>
      <label className="field">Semester (mahasiswa)<input name="semester" type="number" min="1" max="16" defaultValue={education?.semester ?? ""}/></label>
      <label className="field">Jurusan (siswa SMK)<input name="major" defaultValue={education?.major ?? ""} maxLength={160}/></label>
      <label className="field">Kelas (siswa SMK)<select name="grade" defaultValue={education?.grade ?? ""}><option value="">Pilih kelas</option><option value="10">10</option><option value="11">11</option><option value="12">12</option></select></label>
      <label className="field">NIM atau NISN <input name="identity" minLength={3} maxLength={64} required autoComplete="off"/><small>NIM unik dalam institusinya. NISN harus terdiri dari 10 angka. Tidak ditampilkan ke publik.</small></label>
      <label className="field">Tanggal lahir (privat)<input name="dateOfBirth" type="date" max={new Date().toISOString().slice(0,10)} required/><small>Dibutuhkan untuk menghitung kelayakan persetujuan wali dan tidak tampil pada profil.</small></label>
      <button className="button button-primary" type="submit">Simpan onboarding</button>
    </form> : null}

    <h2>Verifikasi status pelajar</h2>
    <p className="muted">Unggah KTM atau bukti aktif sekolah. PDF/JPG/PNG/WebP, maksimal 5 MB.</p>
    {effectiveStatus !== "VERIFIED" && <form action={submitStudentVerification} className="form-stack"><label className="field">Bukti verifikasi<input type="file" name="evidence" accept="application/pdf,image/jpeg,image/png,image/webp" required/></label><button className="button button-primary" type="submit">Kirim untuk verifikasi</button></form>}

    {consent?.is_minor && consent.consent_status !== "CONSENTED" && <><h2>Persetujuan wali</h2><p className="muted">Diperlukan sebelum mengikuti project jika usia masih di bawah 18 tahun. Ini adalah catatan persetujuan, bukan tanda tangan digital.</p><form action={requestGuardianConsent} className="form-stack"><label className="field">Nama wali<input name="guardianName" required maxLength={120}/></label><label className="field">Hubungan<input name="relationship" required maxLength={80}/></label><label className="field">Kontak wali<input name="contact" required maxLength={254}/></label><input type="hidden" name="policyVersion" value="guardian-consent-v1"/><button className="button button-secondary">Buat tautan persetujuan (berlaku 7 hari)</button></form></>}
    {consent?.is_minor && <p className="muted">Status persetujuan wali: {consent.consent_status ?? "Belum diminta"}</p>}
  </section>;
}
