"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

interface OAuthButtonsProps {
  googleEnabled: boolean;
  appleEnabled: boolean;
  /** "Signing in…" vs "Signing up…" */
  mode?: "signin" | "signup";
}

export function OAuthButtons({
  googleEnabled,
  appleEnabled,
  mode = "signin",
}: OAuthButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  if (!googleEnabled && !appleEnabled) return null;

  const verb = mode === "signup" ? "Signing up" : "Signing in";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {googleEnabled && (
        <button
          type="button"
          onClick={async () => {
            setGoogleLoading(true);
            await signIn("google", { callbackUrl: "/dashboard" });
          }}
          disabled={googleLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.625rem",
            padding: "0.625rem 1rem",
            borderRadius: "var(--radius-md, 6px)",
            border: "1px solid var(--cream-border, #d4c4a8)",
            background: "#fff",
            color: "#3c4043",
            fontFamily: "'Roboto', system-ui, sans-serif",
            fontSize: "0.9375rem",
            fontWeight: 500,
            cursor: googleLoading ? "wait" : "pointer",
            width: "100%",
            height: "44px",
            transition: "background 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#f8f8f8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#fff";
          }}
        >
          {/* Google SVG logo */}
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            />
          </svg>
          {googleLoading ? `${verb}…` : "Continue with Google"}
        </button>
      )}

      {appleEnabled && (
        <button
          type="button"
          onClick={async () => {
            setAppleLoading(true);
            await signIn("apple", { callbackUrl: "/dashboard" });
          }}
          disabled={appleLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.625rem",
            padding: "0.625rem 1rem",
            borderRadius: "var(--radius-md, 6px)",
            border: "none",
            background: "#000",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "0.9375rem",
            fontWeight: 500,
            cursor: appleLoading ? "wait" : "pointer",
            width: "100%",
            height: "44px",
            transition: "background 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1a";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#000";
          }}
        >
          {/* Apple SVG logo */}
          <svg
            width="16"
            height="19"
            viewBox="0 0 814 1000"
            aria-hidden="true"
            fill="white"
          >
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.8-165.5-127.4C46.7 790.7 0 663 0 541.8c0-194.3 125.4-297.5 248.2-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
          </svg>
          {appleLoading ? `${verb}…` : "Continue with Apple"}
        </button>
      )}

      {/* Divider — only shown when there are OAuth buttons above the email form */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          margin: "0.25rem 0",
        }}
      >
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "var(--cream-border, #d4c4a8)",
          }}
        />
        <span
          style={{
            fontSize: "0.8125rem",
            color: "var(--brown-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          or
        </span>
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "var(--cream-border, #d4c4a8)",
          }}
        />
      </div>
    </div>
  );
}
