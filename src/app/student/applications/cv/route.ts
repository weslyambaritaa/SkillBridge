import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAccount } from "@/features/auth/data";
import { validatedCv } from "@/features/applications/cv-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function back(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/student/applications?${query}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return new Response("Forbidden", { status: 403 });
  }

  const account = await getCurrentAccount();
  if (!account) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (account.role !== "STUDENT") return NextResponse.redirect(new URL("/unauthorized", request.url), 303);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 6 * 1024 * 1024) {
    return back(request, "error=cv");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(request, "error=cv");
  }
  const applicationId = form.get("applicationId");
  if (typeof applicationId !== "string" || !uuidPattern.test(applicationId)) return back(request, "error=cv");
  const cv = await validatedCv(form);
  if (!cv) return back(request, "error=cv");

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) return NextResponse.redirect(new URL("/login", request.url), 303);

    const path = `${userResult.user.id}/applications/${randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage.from("application-cvs").upload(path, cv.bytes, {
      contentType: "application/pdf", upsert: false,
    });
    if (uploadError) return back(request, "error=cv_upload");

    const { error } = await supabase.rpc("student_attach_application_cv", {
      p_application_id: applicationId, p_cv_path: path,
      p_cv_filename: cv.file.name.slice(0, 180), p_cv_mime: "application/pdf", p_cv_size: cv.file.size,
    });
    if (error) {
      await supabase.storage.from("application-cvs").remove([path]);
      return back(request, "error=cv_upload");
    }
    return back(request, "cv_attached=1");
  } catch {
    return back(request, "error=cv_upload");
  }
}
