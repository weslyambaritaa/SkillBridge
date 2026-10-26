"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/features/auth/authorization";
import { ensureAccountForCurrentUser } from "@/features/auth/data";
import { loginSchema, registrationSchema } from "@/features/auth/schemas";
import type { AuthActionState, SelfAssignableRole } from "@/features/auth/types";
import { logSafeAuthFailure, logSafeEvent } from "@/lib/logger";

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
    const invalidFields = new Set(
      parsed.error.issues.map((issue) => issue.path[0]),
    );
    const messages = [
      invalidFields.has("email") ? "Periksa format email." : null,
      invalidFields.has("password") ? "Kata sandi harus terdiri dari minimal 8 karakter." : null,
      invalidFields.has("role") ? "Pilih jenis akun Student atau UMKM." : null,
    ].filter((message): message is string => message !== null);

    return {
      message: messages.length > 0
        ? messages.join(" ")
        : "Periksa kembali data pendaftaran.",
    };
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
      if (error.status === 0 || error.name === "AuthRetryableFetchError") {
        logSafeAuthFailure("auth.service_unavailable", error);
        return {
          message: "Layanan autentikasi tidak dapat dijangkau. Periksa koneksi lalu coba lagi.",
        };
      }

      if (error.code === "user_already_exists" || error.code === "email_exists") {
        logSafeAuthFailure("auth.signup_rejected", error);
        return {
          message: "Email ini sudah terdaftar. Silakan masuk atau gunakan fitur reset kata sandi.",
        };
      }

      if (error.code === "weak_password") {
        logSafeAuthFailure("auth.signup_rejected", error);
        return {
          message: "Kata sandi belum cukup kuat. Gunakan minimal 8 karakter dan kombinasi yang lebih kuat.",
        };
      }

      logSafeAuthFailure("auth.signup_rejected", error);
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
      if (error.status === 0 || error.name === "AuthRetryableFetchError") {
        logSafeAuthFailure("auth.service_unavailable", error);
        return {
          message: "Layanan autentikasi tidak dapat dijangkau. Periksa koneksi lalu coba lagi.",
        };
      }

      if (error.code === "email_not_confirmed") {
        logSafeAuthFailure("auth.login_rejected", error);
        return {
          message: "Email belum dikonfirmasi. Buka tautan konfirmasi di email sebelum masuk.",
        };
      }

      logSafeAuthFailure("auth.login_rejected", error);
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
