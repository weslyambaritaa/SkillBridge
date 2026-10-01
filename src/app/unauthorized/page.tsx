import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Akses dibatasi</p>
        <h1>Halaman ini tidak tersedia untuk role akunmu.</h1>
        <p className="muted">Gunakan dashboard sesuai jenis akun yang terdaftar.</p>
        <Link className="button button-primary button-link" href="/dashboard">Kembali ke dashboard</Link>
      </section>
    </main>
  );
}
