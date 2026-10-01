import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="wordmark" href="/">SkillBridge</Link>
        <p className="eyebrow">Mulai dari sini</p>
        <h1>Buat akun SkillBridge</h1>
        <p className="muted">Pilih jenis akun. Admin hanya dapat diprovision secara terkontrol.</p>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
