import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicEnvironment } from "@/lib/env";
import { hasRequiredRole } from "@/features/auth/authorization";
import type { Account, SelfAssignableRole, UserRole } from "@/features/auth/types";

type AccountRow = Omit<Account, "role">;

export async function ensureAccountForCurrentUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  requestedRole?: SelfAssignableRole,
): Promise<Account | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: existingAccount, error: accountError } = await supabase
    .from("accounts")
    .select("id, created_at, updated_at")
    .eq("auth_user_id", user.id)
    .maybeSingle<AccountRow>();

  if (accountError) return null;

  if (!existingAccount) {
    const metadataRole = user.user_metadata?.registration_role;
    const role = requestedRole ??
      (metadataRole === "BUSINESS" || metadataRole === "STUDENT"
        ? metadataRole
        : null);

    if (!role) return null;

    const { error: bootstrapError } = await supabase.rpc("bootstrap_account", {
      p_requested_role: role,
    });

    if (bootstrapError) return null;
  }

  const { data: account, error: finalAccountError } = await supabase
    .from("accounts")
    .select("id, created_at, updated_at")
    .eq("auth_user_id", user.id)
    .single<AccountRow>();

  if (finalAccountError || !account) return null;

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("account_id", account.id)
    .single<{ role: UserRole }>();

  if (roleError || !roleRecord) return null;

  return { ...account, role: roleRecord.role };
}

export async function getCurrentAccount(): Promise<Account | null> {
  if (!getPublicEnvironment()) return null;

  const supabase = await createSupabaseServerClient();
  return ensureAccountForCurrentUser(supabase);
}

export async function requireAuth(): Promise<Account> {
  const account = await getCurrentAccount();

  if (!account) redirect("/login?next=%2Fdashboard");

  return account;
}

export async function requireRole(requiredRole: UserRole): Promise<Account> {
  const account = await requireAuth();

  if (!hasRequiredRole(account.role, requiredRole)) {
    redirect("/unauthorized");
  }

  return account;
}
