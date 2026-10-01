import Link from "next/link";
import { getPublicEnvironment } from "@/lib/env";

export default function Home() {
  const isConfigured = getPublicEnvironment() !== null;

  return (
    <main className="landing-page">
      <header className="site-header">
        <Link className="wordmark" href="/">SkillBridge</Link>
        <nav aria-label="Navigasi utama" className="header-actions">
          <Link className="text-link" href="/login">Masuk</Link>
          <Link className="text-link" href="/projects">Browse projects</Link>
          <Link className="button button-primary button-link" href="/register">Buat akun</Link>
        </nav>
      </header>
      <section className="hero">
        <p className="eyebrow">Turn Skills Into Real Experience</p>
        <h1>Skill yang kamu punya.<br /><span>Pengalaman yang bisa dibuktikan.</span></h1>
        <p className="hero-copy">
          SkillBridge mempertemukan student teknologi dengan project transformasi digital nyata dari UMKM Indonesia.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary button-link" href="/register">Mulai bergabung</Link>
          <Link className="button button-secondary button-link" href="/login">Saya sudah punya akun</Link>
        </div>
        <p className={isConfigured ? "setup-status setup-ready" : "setup-status"} role="status">
          {isConfigured
            ? "Environment Supabase terdeteksi."
            : "Mode setup: isi kredensial Supabase di .env.local untuk mengaktifkan autentikasi."}
        </p>
      </section>
      <section aria-label="Cara kerja SkillBridge" className="steps-grid">
        <article className="step-card"><span>01</span><h2>Temukan kebutuhan nyata</h2><p>UMKM merumuskan project digital yang membutuhkan keahlian student.</p></article>
        <article className="step-card"><span>02</span><h2>Kerjakan bersama</h2><p>Role, scope, agreement, dan milestone membantu tim punya arah yang jelas.</p></article>
        <article className="step-card"><span>03</span><h2>Buktikan kemampuan</h2><p>Deliverable dan kontribusi project menjadi evidence di Competency Passport.</p></article>
      </section>
    </main>
  );
}
