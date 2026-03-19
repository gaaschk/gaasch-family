import { Suspense } from "react";
import { OAuthButtons } from "@/src/components/OAuthButtons";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const googleEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const appleEnabled = !!(process.env.APPLE_ID && process.env.APPLE_SECRET);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "var(--surface-base)" }}
    >
      <div className="w-full max-w-sm">
        <div style={{ marginBottom: "2rem" }}>
          <h1
            className="font-display"
            style={{
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--brown-text)",
              marginBottom: "0.5rem",
            }}
          >
            Sign in to Heirloom
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--brown-muted)" }}>
            Your family&apos;s living history
          </p>
        </div>
        <OAuthButtons
          googleEnabled={googleEnabled}
          appleEnabled={appleEnabled}
          mode="signin"
        />
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
