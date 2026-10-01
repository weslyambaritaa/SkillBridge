import { NextResponse } from "next/server";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ kind: string; evidenceId: string }> }) {
  await requireRole("ADMIN");
  const { kind, evidenceId } = await context.params;
  if (!/^[0-9a-f-]{36}$/iu.test(evidenceId) || !["student", "business"].includes(kind)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = await createSupabaseServerClient();
  const { data: path, error } = await supabase.rpc("admin_evidence_path", { p_evidence_id: evidenceId, p_kind: kind.toUpperCase() });
  if (error || !path) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const { data, error: signError } = await supabase.storage.from("verification-evidence").createSignedUrl(path, 60, { download: true });
  if (signError || !data?.signedUrl) return new Response("Evidence unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(data.signedUrl, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
