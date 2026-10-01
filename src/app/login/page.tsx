import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="wordmark" href="/">SkillBridge</Link>
        <p className="eyebrow">Selamat datang kembali</p>
        <h1>Masuk ke akunmu</h1>
        <p className="muted">Lanjutkan perjalanan dari skill menuju pengalaman nyata.</p>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
