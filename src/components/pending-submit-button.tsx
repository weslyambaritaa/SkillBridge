"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function PendingSubmitButton({
  children,
  pendingLabel = "Sedang memproses...",
  className = "button button-primary",
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} name={name} value={value} aria-live="polite">
    {pending ? <><span className="submit-spinner" aria-hidden="true"/> {pendingLabel}</> : children}
  </button>;
}
