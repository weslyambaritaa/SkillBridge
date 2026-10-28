import Link from "next/link";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveBusinessProfile, submitBusinessVerification } from "@/features/identity/actions";
import { businessEligibleForProject } from "@/features/identity/domain";
import { verificationStatusLabel } from "@/lib/status-labels";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type Search = Promise<Record<string, string | string[] | undefined>>;
const profileErrorMessages: Record<string, string> = {
  schema: "Fungsi simpan profil usaha belum tersedia di database Supabase. Migrasi identity verification perlu diterapkan.",
  permission: "Akun ini belum memiliki izin UMKM untuk menyimpan profil. Keluar lalu masuk kembali, atau hubungi admin.",
  review: "Nama, kategori, NIB, website, atau tautan usaha yang sudah terverifikasi perlu diubah melalui Admin.",
  invalid: "Nama dan kategori usaha wajib diisi dengan benar.",
  url: "Tautan website dan media sosial harus diawali http:// atau https://.",
  profile: "Periksa nama usaha, kategori, email, nomor telepon, tautan, dan NIB. Pastikan semua data memakai format yang benar.",
  save: "Profil usaha belum dapat disimpan. Coba lagi atau hubungi admin.",
};

export default async function BusinessDashboard({ searchParams }: { searchParams: Search }) {
  await requireRole("BUSINESS");
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: verification }] = await Promise.all([
    supabase.from("business_profiles").select("id,business_name,description,business_category,business_email,business_phone,website,social_url").maybeSingle(),
    supabase.from("business_verifications").select("id,status,nib,current_attempt_id").maybeSingle(),
  ]);
  const params = await searchParams;
  const { data: attempt } = verification?.current_attempt_id
    ? await supabase.from("business_verification_attempts").select("id,attempt_number,status,evidence_description,reason").eq("id", verification.current_attempt_id).maybeSingle()
    : { data: null };
  const { data: evidence } = attempt
    ? await supabase.from("business_verification_evidence").select("original_filename").eq("attempt_id", attempt.id)
    : { data: [] };
  const { data: attemptHistory } = verification?.id
    ? await supabase.from("business_verification_attempts").select("attempt_number,status,reason").eq("verification_id", verification.id).order("attempt_number", { ascending: false })
    : { data: [] };
  const status = verification?.status ?? "UNVERIFIED";

  return <section className="dashboard-card form-stack business-dashboard">
    <header className="business-intro"><div><p className="eyebrow">Ruang UMKM</p><h1>Profil usaha dan verifikasi</h1><p className="muted">Lengkapi profil, kirim dokumen, dan pantau proses peninjauan usaha.</p></div>{status === "VERIFIED" && <Link className="button button-primary" href="/business/projects">Kelola project</Link>}</header>
    <div className="business-overview-grid">
      <article className="business-overview-card"><span>Status verifikasi</span><strong>{verificationStatusLabel(status)}</strong><small>{status === "VERIFIED" ? "Profil usaha sudah lolos peninjauan." : "Admin perlu meninjau profil dan dokumen usaha."}</small></article>
      <article className="business-overview-card"><span>Kelayakan project</span><strong>{businessEligibleForProject(status) ? "Siap membuat project" : "Belum memenuhi syarat"}</strong><small>{businessEligibleForProject(status) ? "Anda dapat mulai mengelola kebutuhan project." : "Lengkapi verifikasi usaha untuk membuka fitur project."}</small></article>
    </div>
    {params.error && <p className="notice notice-error">{profileErrorMessages[String(params.error)] ?? "Data belum dapat diproses. Periksa kolom dan file yang diunggah."}</p>}
    {params.saved && <p className="notice notice-success">Profil usaha tersimpan.</p>}
    {params.submitted && <p className="notice notice-success">Bukti terkirim untuk ditinjau Admin.</p>}
    {attempt?.reason && <p className="notice notice-error">Catatan Admin: {attempt.reason}</p>}
    {attemptHistory?.length ? <div className="student-info-card"><strong>Riwayat verifikasi</strong><ul>{attemptHistory.map((item) => <li key={item.attempt_number}>Pengajuan #{item.attempt_number} · {verificationStatusLabel(item.status)}{item.reason ? ` · Catatan: ${item.reason}` : ""}</li>)}</ul></div> : null}
    {evidence?.length ? <div className="student-info-card"><strong>Bukti tersimpan privat</strong><p>{evidence.map((item) => item.original_filename).join(", ")}</p></div> : null}
    <h2>Profil usaha</h2>
    <form action={saveBusinessProfile} className="form-stack dashboard-form-card business-profile-form">
      <label className="field">Nama usaha<input name="businessName" defaultValue={profile?.business_name ?? ""} minLength={2} maxLength={160} required/></label>
      <label className="field">Kategori<input name="category" defaultValue={profile?.business_category ?? ""} minLength={2} maxLength={100} required/></label>
      <label className="field">Deskripsi<textarea name="description" defaultValue={profile?.description ?? ""} maxLength={2000}/></label>
      <label className="field">Email usaha<input name="email" type="email" defaultValue={profile?.business_email ?? ""}/></label>
      <label className="field">Telepon usaha<input name="phone" type="tel" defaultValue={profile?.business_phone ?? ""}/></label>
      <label className="field">Website<input name="website" type="url" defaultValue={profile?.website ?? ""}/></label>
      <label className="field">Tautan sosial/marketplace<input name="socialUrl" type="url" defaultValue={profile?.social_url ?? ""}/></label>
      <label className="field">NIB (privat, opsional)<input name="nib" defaultValue={verification?.nib ?? ""} maxLength={32} autoComplete="off"/><small>Tidak pernah ditampilkan pada profil publik.</small></label>
      <PendingSubmitButton pendingLabel="Menyimpan profil...">Simpan profil</PendingSubmitButton>
    </form>
    {status !== "VERIFIED" && <><h2>Kirim bukti usaha</h2><p className="muted">Bukti dapat berupa NIB, website, marketplace, akun sosial usaha, atau dokumen usaha. Jelaskan bukti tersebut; dokumen opsional jika profil sudah menyertakan NIB, website, atau tautan sosial. PDF/JPG/PNG/WebP, maksimal 5 MB.</p>
      <form action={submitBusinessVerification} className="form-stack dashboard-form-card"><label className="field">Deskripsi bukti<textarea name="evidenceDescription" minLength={5} maxLength={1200} required/></label><label className="field">Dokumen bukti (opsional bila bukti profil diisi)<input type="file" name="evidence" accept="application/pdf,image/jpeg,image/png,image/webp"/></label><PendingSubmitButton pendingLabel="Mengirim bukti...">Kirim untuk verifikasi</PendingSubmitButton></form></>}
  </section>;
}
