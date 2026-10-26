import Link from "next/link";
import { getCurrentAccount } from "@/features/auth/data";
import { dashboardPathForRole } from "@/features/auth/authorization";
import { PublicShell } from "@/components/public-shell";

export default async function Home() {
  const account = await getCurrentAccount();

  return (
    <PublicShell account={account} section="home">
      <div className="landing-page home-page">
      <section className="hero home-hero">
        <div className="home-hero-copy">
        <p className="eyebrow">Turn Skills Into Real Experience</p>
        <h1>Skill yang kamu punya.<br /><span>Pengalaman yang bisa dibuktikan.</span></h1>
        <p className="hero-copy">
          SkillBridge mempertemukan student teknologi dengan project transformasi digital nyata dari UMKM Indonesia.
        </p>
        <div className="hero-actions">
          {account ? <Link className="button button-primary button-link" href={dashboardPathForRole(account.role)}>Buka dashboard</Link> : <><Link className="button button-primary button-link" href="/register">Mulai bergabung</Link><Link className="button button-secondary button-link" href="/login">Saya sudah punya akun</Link></>}
        </div>
        <p className="hero-note">Project nyata. Kolaborasi terarah. Kontribusi yang tercatat.</p>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-visual-top"><span>SKILLBRIDGE / 01</span><span>↗</span></div>
          <div className="home-visual-center"><span>01 <i /></span><span>02 <i /></span><span>03 <i /></span></div>
          <p>Dari kemampuan<br/>menuju kontribusi.</p>
          <div className="home-visual-bottom"><span>Temukan project</span><span>Kerjakan bersama</span><span>Buktikan skill</span></div>
        </div>
      </section>
      <section className="section-heading"><p className="eyebrow">Dari skill ke pengalaman</p><h2>Langkah kecil. Dampak nyata.</h2><p className="muted">Bangun pengalaman melalui kebutuhan digital usaha di sekitarmu.</p></section>
      <section aria-label="Cara kerja SkillBridge" className="steps-grid">
        <article className="step-card"><span>01</span><h2>Temukan kebutuhan nyata</h2><p>UMKM merumuskan project digital yang membutuhkan keahlian student.</p></article>
        <article className="step-card"><span>02</span><h2>Kerjakan bersama</h2><p>Role, scope, agreement, dan milestone membantu tim punya arah yang jelas.</p></article>
        <article className="step-card"><span>03</span><h2>Buktikan kemampuan</h2><p>Deliverable dan kontribusi project menjadi evidence di Competency Passport.</p></article>
      </section>
      <section className="landing-cta"><div><p className="eyebrow">Mulai perjalananmu</p><h2>Temukan tempat untuk skill kamu.</h2><p className="muted">Jelajahi kebutuhan UMKM dan temukan project yang sesuai dengan kemampuanmu.</p></div><Link className="button button-primary" href="/projects">Jelajahi project <span aria-hidden="true">↗</span></Link></section>
      <footer className="site-footer"><Link className="wordmark" href="/">SkillBridge</Link><p>Skill nyata untuk masa depan yang lebih baik.</p><Link className="text-link" href="/projects">Project marketplace ↗</Link></footer>
      </div>
    </PublicShell>
  );
}
