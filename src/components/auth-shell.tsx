import type { ReactNode } from "react";
import Link from "next/link";

export function AuthShell({ mode, children }: { mode: "login" | "register"; children: ReactNode }) {
  const isLogin = mode === "login";

  return <main className="auth-screen">
    <aside className="auth-side" aria-label="Tentang SkillBridge">
      <Link className="wordmark" href="/">SkillBridge</Link>
      <div className="auth-side-content">
        <p className="eyebrow">TURN SKILLS INTO REAL EXPERIENCE</p>
        <h2>Skill bertemu <span>kesempatan nyata.</span></h2>
        <p>Temukan project digital dari UMKM, kerjakan bersama, dan bangun bukti kemampuan yang bisa kamu tunjukkan.</p>
        <div className="auth-journey" aria-hidden="true">
          <div><span>01</span><strong>Temukan project</strong></div>
          <div><span>02</span><strong>Kerjakan bersama</strong></div>
          <div><span>03</span><strong>Buktikan kemampuan</strong></div>
        </div>
      </div>
      <nav className="auth-side-nav" aria-label="Navigasi umum">
        <Link href="/">Beranda</Link>
        <Link href="/projects">Jelajahi project ↗</Link>
      </nav>
    </aside>
    <div className="auth-panel">
      <header className="auth-panel-header">
        <Link className="wordmark auth-mobile-brand" href="/">SkillBridge</Link>
        <Link className="auth-back" href="/">← Kembali ke beranda</Link>
      </header>
      <div className="auth-form-card">
        <div className="auth-form-heading">
          <p className="eyebrow">{isLogin ? "SELAMAT DATANG KEMBALI" : "MULAI DARI SINI"}</p>
          <h1>{isLogin ? "Masuk ke SkillBridge" : "Buat akun SkillBridge"}</h1>
          <p>{isLogin ? "Lanjutkan perjalananmu. Project dan peluang baru menunggu." : "Bergabung sebagai student atau UMKM dan mulai berkolaborasi."}</p>
        </div>
        {children}
        <div className="auth-form-footer">{isLogin ? "Baru di SkillBridge?" : "Sudah punya akun?"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Buat akun" : "Masuk"} <span aria-hidden="true">↗</span></Link></div>
      </div>
      <footer className="auth-panel-footer">SkillBridge · Pengalaman nyata dimulai dari sini.</footer>
    </div>
  </main>;
}
