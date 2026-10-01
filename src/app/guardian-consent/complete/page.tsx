import Link from "next/link";

export const metadata = { title: "Status persetujuan · SkillBridge", referrer: "no-referrer", robots: { index: false, follow: false } };
export default async function GuardianConsentComplete({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Persetujuan wali</p><h1>{result === "accepted" ? "Persetujuan tercatat" : "Tautan tidak berlaku"}</h1><p className="muted">{result === "accepted" ? "Terima kasih. Catatan persetujuan telah disimpan dan tautan tidak dapat digunakan kembali." : "Tautan telah digunakan, kedaluwarsa, atau tidak valid. Minta student membuat tautan baru."}</p><Link className="text-link" href="/">Kembali ke SkillBridge</Link></section></main>;
}
