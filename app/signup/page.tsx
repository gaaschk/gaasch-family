import { OAuthButtons } from "@/src/components/OAuthButtons";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
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
              fontWeight: 400,
              color: "var(--brown-text)",
              marginBottom: "0.5rem",
            }}
          >
            Start your family history
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--brown-muted)",
              fontStyle: "italic",
              fontFamily: "var(--font-narrative)",
            }}
          >
            Your tree. Your story. Private.
          </p>
        </div>

        <OAuthButtons
          googleEnabled={googleEnabled}
          appleEnabled={appleEnabled}
          mode="signup"
        />

        <SignupForm />
      </div>
    </main>
  );
}
