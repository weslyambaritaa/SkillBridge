"use client";

import { useEffect, useState } from "react";
import { confirmGuardianConsentToken, getGuardianConsentNotice } from "@/features/identity/actions";
import { guardianTokenFromFragment } from "@/features/identity/domain";

type Notice = { valid: boolean; studentDisplayName?: string; policyVersion?: string; expiresAt?: string };

export default function GuardianConsentForm() {
  const [consent, setConsent] = useState<{ notice: Notice; token: string } | null>(null);

  useEffect(() => {
    const fragmentToken = guardianTokenFromFragment(window.location.hash);
    window.history.replaceState(window.history.state, "", window.location.pathname);
    if (!fragmentToken) {
      void Promise.resolve().then(() => setConsent({ notice: { valid: false }, token: "" }));
      return;
    }
    void getGuardianConsentNotice(fragmentToken)
      .then((notice) => setConsent({ notice, token: fragmentToken }))
      .catch(() => setConsent({ notice: { valid: false }, token: "" }));
  }, []);

  if (!consent) return <section className="auth-card"><p className="eyebrow">Persetujuan wali</p><h1>Memeriksa tautan</h1><p className="muted">Tunggu sebentar…</p></section>;
  if (!consent.notice.valid) return <section className="auth-card"><p className="eyebrow">Persetujuan wali</p><h1>Tautan tidak berlaku</h1><p className="muted">Tautan telah digunakan, kedaluwarsa, atau tidak valid. Minta student membuat tautan baru.</p></section>;

  return <section className="auth-card form-stack"><p className="eyebrow">Persetujuan wali</p><h1>Konfirmasi persetujuan</h1>
    <p className="muted">Student bernama <strong>{consent.notice.studentDisplayName}</strong> meminta persetujuan wali untuk berpartisipasi dalam kegiatan project SkillBridge. Persetujuan ini dicatat sebagai persetujuan pada platform dan bukan tanda tangan digital atau nasihat hukum.</p>
    <p className="muted">Versi pemberitahuan: {consent.notice.policyVersion}. Tautan berlaku sampai {consent.notice.expiresAt ? new Date(consent.notice.expiresAt).toLocaleString("id-ID") : "waktu yang ditentukan"}.</p>
    <form action={confirmGuardianConsentToken.bind(null, consent.token)}><button className="button button-primary">Saya menyetujui</button></form>
  </section>;
}
