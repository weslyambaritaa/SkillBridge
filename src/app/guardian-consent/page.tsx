import type { Metadata } from "next";
import GuardianConsentForm from "@/features/identity/guardian-consent-form";

export const metadata: Metadata = { title: "Persetujuan wali · SkillBridge", referrer: "no-referrer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function GuardianConsentPage() {
  return <main className="auth-page"><GuardianConsentForm/></main>;
}
