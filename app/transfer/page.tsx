"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { useDemoSession } from "../components/demo-session-provider";

type TransferResult = {
  id: string;
  toOrgName: string;
  rowCount: number;
  transferredAt: string;
};

export default function TransferPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useDemoSession();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TransferResult | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.replace("/login");
  }, [user, sessionLoading, router]);

  if (sessionLoading || !user) return null;

  const handleTransfer = async () => {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Transfer failed. Please try again.");
        return;
      }

      setResult(data.transfer);
      setMessage("");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const transferredAtFormatted = result
    ? new Date(result.transferredAt).toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";

  return (
    <AppShell email={user.email} orgName={user.orgName}>
      <h2 className="headline-sm">Transfer Data</h2>
      <p className="subhead">
        Send your organization&apos;s data to the recipient organization. A notification
        email will be sent automatically.
      </p>

      {/* ── Transfer form ── */}
      {!result ? (
        <div className="form-grid" style={{ marginTop: 20 }}>
          {/* Org info */}
          <div className="transfer-info-card">
            <div className="transfer-org">
              <span className="org-label">From</span>
              <span className="org-name">{user.orgName}</span>
            </div>
            <div className="transfer-arrow">→</div>
            <div className="transfer-org">
              <span className="org-label">To</span>
              <span className="org-name">Recipient Organization</span>
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="transfer-message">
              Message{" "}
              <span className="muted-text" style={{ fontSize: 12 }}>
                (optional, max 500 chars)
              </span>
            </label>
            <textarea
              id="transfer-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Include a message with this data transfer…"
              maxLength={500}
              disabled={isLoading}
            />
            <p className="muted-text" style={{ fontSize: 12, marginTop: 4, textAlign: "right" }}>
              {message.length}/500
            </p>
          </div>

          {error && (
            <div className="notice notice--error" role="alert">
              <p>{error}</p>
            </div>
          )}

          <button
            id="transfer-btn"
            className="btn"
            type="button"
            onClick={handleTransfer}
            disabled={isLoading}
          >
            {isLoading ? "Transferring data…" : "Transfer Data →"}
          </button>
        </div>
      ) : (
        /* ── Success state ── */
        <div style={{ marginTop: 20 }}>
          <div className="notice notice--success" role="status">
            <p className="notice-title">✅ Transfer Successful</p>
            <p style={{ marginTop: 8 }}>
              <strong>{result.rowCount.toLocaleString()} rows</strong> were sent to{" "}
              <strong>{result.toOrgName}</strong> on {transferredAtFormatted}.
            </p>
            <p className="muted-text" style={{ fontSize: 13, marginTop: 6 }}>
              A notification email has been sent to the recipient organization.
            </p>
          </div>

          <button
            className="btn btn-ghost"
            style={{ marginTop: 16 }}
            onClick={() => setResult(null)}
          >
            Send Another Transfer
          </button>
        </div>
      )}
    </AppShell>
  );
}
