/**
 * Automatic client-side error reporter.
 * Sends errors to POST /api/errors so they appear in the admin Error Log tab.
 * Fire-and-forget: never throws, never blocks the UI.
 */

import { getApiUrl } from "./queryClient";

let userId: string | null = null;

/** Call once on app init with the current user id so errors are attributable. */
export function setErrorReporterUserId(id: string | null) {
  userId = id;
}

export function reportError(
  message: string,
  stack?: string | null,
  component?: string | null,
) {
  try {
    fetch(getApiUrl("/api/errors"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(message).slice(0, 500),
        stack: stack ? String(stack).slice(0, 2000) : null,
        component: component ?? null,
        userId: userId ?? null,
        url: window.location.href,
      }),
    }).catch(() => { /* best-effort — never throw */ });
  } catch { /* never throw from error reporter */ }
}
