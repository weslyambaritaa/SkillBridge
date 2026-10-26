import { NextResponse } from "next/server";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ applicationId: string }> }) {
  await requireRole("BUSINESS");
  const { applicationId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(applicationId)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("business_application_cv", { p_application_id: applicationId });
  const cv = (data as { storage_path: string; original_filename: string }[] | null)?.[0];
  if (error || !cv?.storage_path) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const { data: signed, error: signError } = await supabase.storage.from("application-cvs")
    .createSignedUrl(cv.storage_path, 60, { download: true });
  if (signError || !signed?.signedUrl) {
    return new Response("CV unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(signed.signedUrl, {
    status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
