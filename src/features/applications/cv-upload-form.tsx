"use client";

import { useState } from "react";

export function CvUploadForm({ applicationId }: { applicationId: string }) {
  const [pending, setPending] = useState(false);
  return <form action="/student/applications/cv" method="post" encType="multipart/form-data" className="form-stack" onSubmit={() => setPending(true)}>
    <input type="hidden" name="applicationId" value={applicationId}/>
    <label className="field">Lampirkan CV untuk lamaran ini (PDF, maksimal 5 MB)<input type="file" name="cv" accept="application/pdf,.pdf" required disabled={pending}/></label>
    <button className="button button-secondary" type="submit" disabled={pending} aria-live="polite">{pending && <span className="submit-spinner" aria-hidden="true"/>}{pending ? " Mengunggah CV..." : "Unggah CV"}</button>
  </form>;
}
