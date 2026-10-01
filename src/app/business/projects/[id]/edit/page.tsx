import { notFound } from "next/navigation";
import { ProjectEditorPage } from "@/features/projects/project-editor-page";

export default async function EditProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) notFound();
  return <ProjectEditorPage projectId={id} searchParams={searchParams}/>;
}
