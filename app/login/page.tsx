"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { useDemoSession } from "../components/demo-session-provider";

type Step = "email" | "otp";

function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useDemoSession();

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setNotice("Check your inbox — we sent you a 6-digit code.");
      setStep("otp");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid code. Please try again.");
        return;
      }

      await refreshSession();
      const next = searchParams.get("next") ?? "/dashboard";
      router.push(next);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <p className="badge">Secure Workspace</p>
        <h1 className="headline">Secure Login</h1>

        {step === "email" ? (
          <>
            <p className="subhead">Enter your email to receive a one-time code.</p>
            <form className="form-grid" onSubmit={handleEmailSubmit}>
              <div>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="notice notice--error" role="alert">
                  <p>{error}</p>
                </div>
              )}

              <button className="btn" type="submit" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send Login Code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="subhead">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>

            {notice && (
              <div className="notice" role="status" style={{ marginBottom: 16 }}>
                <p>{notice}</p>
              </div>
            )}

            <form className="form-grid" onSubmit={handleOtpSubmit}>
              <div>
                <label htmlFor="otp-code">One-Time Code</label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  style={{ fontSize: 24, letterSpacing: 8, textAlign: "center" }}
                />
              </div>

              {error && (
                <div className="notice notice--error" role="alert">
                  <p>{error}</p>
                </div>
              )}

              <button className="btn" type="submit" disabled={isLoading}>
                {isLoading ? "Verifying…" : "Verify & Sign In"}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                  setNotice("");
                }}
                disabled={isLoading}
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-wrap" />}>
      <LoginForm />
    </Suspense>
  );
}
