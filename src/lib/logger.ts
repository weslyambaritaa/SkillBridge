import "server-only";

export type SafeLogEvent =
  | "auth.signup_rejected"
  | "auth.login_rejected"
  | "auth.service_unavailable";

export function logSafeEvent(event: SafeLogEvent): void {
  // Deliberately accepts only allowlisted event names, never user data or errors.
  console.info(JSON.stringify({ event, timestamp: new Date().toISOString() }));
}
