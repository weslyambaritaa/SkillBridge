import Link from "next/link";
import { ProjectEditorPage } from "@/features/projects/project-editor-page";
import { requireRole } from "@/features/auth/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("BUSINESS");
  const supabase = await createSupabaseServerClient();
  const { data: verification } = await supabase.from("business_verifications").select("status").maybeSingle();
  if (verification?.status !== "VERIFIED") return <section className="dashboard-card"><h1>Verifikasi usaha diperlukan</h1><p className="muted">Business harus verified sebelum membuat project.</p><Link className="text-link" href="/business">Lengkapi verifikasi usaha</Link></section>;
  return <ProjectEditorPage searchParams={searchParams}/>;
}
