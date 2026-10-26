import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell mode="register"><AuthForm mode="register" /></AuthShell>
  );
}
