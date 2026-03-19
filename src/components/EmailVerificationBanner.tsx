"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function EmailVerificationBanner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  // Check if session marks emailVerified
  const emailVerified = (
    session?.user as { emailVerified?: Date | null } | undefined
  )?.emailVerified;

  // Hide if: not logged in, already verified, just verified (?verified=1),
  // or manually dismissed. The ?verified=1 check covers the window between
  // clicking the email link and the JWT naturally refreshing (up to 30min).
  const justVerified = searchParams.get("verified") === "1";
  if (!session?.user || emailVerified || justVerified || dismissed) return null;

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      if (res.status === 429) {
        setRateLimited(true);
      } else {
        setSent(true);
      }
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#FDF3E4",
        borderBottom: "1px solid #E6BC7A",
        padding: "0 1rem",
        height: "44px",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.875rem",
        fontFamily: "var(--font-ui)",
        color: "var(--brown-text)",
      }}
    >
      <span style={{ color: "var(--amber)", fontSize: "1rem" }}>⚑</span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        Please verify your email — we sent a link to{" "}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--brown-2, #4A3020)",
          }}
        >
          {session.user.email}
        </span>
      </span>
      {rateLimited ? (
        <span
          style={{
            color: "var(--brown-muted)",
            fontSize: "0.8125rem",
            flexShrink: 0,
          }}
        >
          Please wait before resending
        </span>
      ) : sent ? (
        <span
          style={{
            color: "var(--forest)",
            fontSize: "0.8125rem",
            flexShrink: 0,
          }}
        >
          Email sent
        </span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--forest)",
            cursor: resending ? "wait" : "pointer",
            textDecoration: "underline",
            fontSize: "0.875rem",
            fontFamily: "var(--font-ui)",
            flexShrink: 0,
          }}
        >
          {resending ? "Sending…" : "Resend email"}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss verification banner"
        onClick={() => setDismissed(true)}
        style={{
          background: "none",
          border: "none",
          padding: "0 0.25rem",
          color: "var(--brown-muted)",
          cursor: "pointer",
          fontSize: "1rem",
          lineHeight: 1,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "4px",
        }}
      >
        ×
      </button>
    </div>
  );
}
