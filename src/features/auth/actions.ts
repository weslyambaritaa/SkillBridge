"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/features/auth/authorization";
import { ensureAccountForCurrentUser } from "@/features/auth/data";
import { loginSchema, registrationSchema } from "@/features/auth/schemas";
import type { AuthActionState, SelfAssignableRole } from "@/features/auth/types";
import { logSafeEvent } from "@/lib/logger";

function formValue(formData: FormData, key: string): unknown {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registrationSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    role: formValue(formData, "role"),
  });

  if (!parsed.success) {
    return { message: "Periksa email, kata sandi, dan jenis akun." };
  }

  let redirectPath: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : null);

    if (!siteUrl) {
      return { message: "Alamat callback autentikasi belum dikonfigurasi." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=%2Fdashboard`,
        data: { registration_role: parsed.data.role },
      },
    });

    if (error) {
      logSafeEvent("auth.signup_rejected");
      return { message: "Pendaftaran belum berhasil. Periksa input dan coba lagi." };
    }

    if (data.session) {
      const account = await ensureAccountForCurrentUser(
        supabase,
        parsed.data.role as SelfAssignableRole,
      );

      if (!account) {
        return { message: "Akun dibuat, tetapi penyiapan profil belum selesai. Silakan login kembali." };
      }

      redirectPath = dashboardPathForRole(account.role);
    } else {
      return {
        success: true,
        message: "Akun dibuat. Buka email untuk mengonfirmasi pendaftaran, lalu login.",
      };
    }
  } catch {
    logSafeEvent("auth.service_unavailable");
    return { message: "Layanan autentikasi belum tersedia. Coba lagi nanti." };
  }

  if (redirectPath) redirect(redirectPath);
  return { message: "Akun dibuat, tetapi tujuan dashboard tidak tersedia." };
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return { message: "Masukkan email yang valid dan kata sandi." };
  }

  let redirectPath: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      logSafeEvent("auth.login_rejected");
      return { message: "Email atau kata sandi tidak valid." };
    }

    const account = await ensureAccountForCurrentUser(supabase);

    if (!account) {
      await supabase.auth.signOut();
      return { message: "Profil akun belum siap. Selesaikan konfirmasi email atau hubungi admin." };
    }

    redirectPath = dashboardPathForRole(account.role);
  } catch {
    logSafeEvent("auth.service_unavailable");
    return { message: "Layanan autentikasi belum tersedia. Coba lagi nanti." };
  }

  if (redirectPath) redirect(redirectPath);
  return { message: "Dashboard akun tidak tersedia." };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
