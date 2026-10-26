"use client";

import { useActionState } from "react";
import { loginAction, registerAction } from "@/features/auth/actions";
import type { AuthActionState } from "@/features/auth/types";

type AuthFormProps = { mode: "login" | "register" };

const initialState: AuthActionState = {};

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="form-stack auth-form">
      {mode === "register" ? (
        <label className="field">
          <span>Daftar sebagai</span>
          <select name="role" defaultValue="STUDENT" required>
            <option value="STUDENT">Student</option>
            <option value="BUSINESS">UMKM</option>
          </select>
        </label>
      ) : null}
      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          required
          maxLength={254}
        />
      </label>
      <label className="field">
        <span>Kata sandi</span>
        <input
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          name="password"
          type="password"
          placeholder="Masukkan kata sandi"
          required
          minLength={mode === "register" ? 8 : 1}
          maxLength={128}
        />
      </label>
      {state.message ? (
        <p className={state.success ? "notice notice-success" : "notice notice-error"} role="status">
          {state.message}
        </p>
      ) : null}
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Memproses…" : mode === "login" ? "Masuk" : "Buat akun"}
      </button>
    </form>
  );
}
