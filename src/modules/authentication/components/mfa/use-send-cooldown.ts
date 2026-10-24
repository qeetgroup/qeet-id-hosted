import { useEffect, useState } from "react";
import type { LoginFactor } from "@/modules/authentication/session";
import { ApiError } from "@/platform/api/client";

// The server sends a factor at most one code every 30 seconds (POST
// /v1/auth/mfa/send). A send it refuses as too soon says how long to wait
// (retry_after), which then takes over.
export const SEND_INTERVAL_SECONDS = 30;

// sendWait is how many seconds to wait before another code can be sent, when
// err is the server refusing a send as too soon; null for any other failure.
export function sendWait(err: unknown): number | null {
  if (!(err instanceof ApiError) || err.code !== "mfa.code_send_limited") return null;
  const after = Number(err.metadata?.retry_after);
  return Number.isFinite(after) && after > 0 ? Math.ceil(after) : SEND_INTERVAL_SECONDS;
}

/**
 * When each code factor (email, SMS) can be sent another code: holdSend starts
 * a factor's wait, and secondsLeft counts it down, ticking once a second while
 * any factor is waiting.
 */
export function useSendCooldown() {
  // When each factor can be sent another code (epoch ms).
  const [sendAfter, setSendAfter] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second while any factor is waiting, for the time shown.
  const sendWaiting = Object.values(sendAfter).some((at) => at > now);
  useEffect(() => {
    if (!sendWaiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sendWaiting]);

  function secondsLeft(f: LoginFactor): number {
    const at = f.id ? sendAfter[f.id] : undefined;
    return at ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
  }

  function holdSend(f: LoginFactor, seconds: number) {
    const at = Date.now();
    setNow(at);
    setSendAfter((prev) => ({ ...prev, [f.id ?? ""]: at + seconds * 1000 }));
  }

  return { secondsLeft, holdSend };
}
