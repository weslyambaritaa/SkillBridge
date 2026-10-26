import type { ReactNode } from "react";
import { getCurrentAccount } from "@/features/auth/data";
import { PublicShell } from "@/components/public-shell";

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const account = await getCurrentAccount();

  return <PublicShell account={account} section="projects">{children}</PublicShell>;
}
