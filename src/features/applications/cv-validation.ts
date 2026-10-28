const MAX_CV_BYTES = 5 * 1024 * 1024;

export async function validatedCv(form: FormData): Promise<{ file: File; bytes: Uint8Array } | null> {
  const candidate = form.get("cv");
  if (!(candidate instanceof File) || candidate.size < 1 || candidate.size > MAX_CV_BYTES
    || (candidate.type !== "application/pdf" && candidate.type !== "")
    || !candidate.name.toLowerCase().endsWith(".pdf")) return null;
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return null;
  return { file: candidate, bytes };
}
