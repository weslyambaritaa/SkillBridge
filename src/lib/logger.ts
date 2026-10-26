import "server-only";

export type SafeLogEvent =
  | "auth.signup_rejected"
  | "auth.login_rejected"
  | "auth.service_unavailable";

const SAFE_AUTH_ERROR_CODES = new Set([
  "email_exists",
  "user_already_exists",
  "weak_password",
  "email_address_not_authorized",
  "email_not_confirmed",
  "signup_disabled",
  "email_provider_disabled",
  "over_email_send_rate_limit",
  "validation_failed",
  "invalid_credentials",
]);

export function logSafeEvent(event: SafeLogEvent): void {
  // Deliberately accepts only allowlisted event names, never user data or errors.
  console.info(JSON.stringify({ event, timestamp: new Date().toISOString() }));
}

export function logSafeAuthFailure(
  event: SafeLogEvent,
  error: { code?: string; status?: number },
): void {
  const code = error.code && SAFE_AUTH_ERROR_CODES.has(error.code)
    ? error.code
    : "other";
  console.info(JSON.stringify({
    event,
    code,
    status: typeof error.status === "number" ? error.status : null,
    timestamp: new Date().toISOString(),
  }));
}
