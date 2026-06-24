"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { useDemoSession } from "../components/demo-session-provider";

type InboxTransfer = {
  id: string;
  fromOrgName: string;
  fromOrgEmail: string;
  message: string;
  rowCount: number;
  transferredAt: string;
};

export default function InboxPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useDemoSession();
  const [transfers, setTransfers] = useState<InboxTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.replace("/login");
  }, [user, sessionLoading, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch("/api/inbox");
        if (!res.ok) {
          if (res.status === 401) { router.replace("/login"); return; }
          throw new Error("Failed to load inbox.");
        }
        const data = await res.json();
        setTransfers(data.transfers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inbox.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, router]);

  if (sessionLoading || !user) return null;

  return (
    <AppShell email={user.email} orgName={user.orgName}>
      <h2 className="headline-sm">Inbox</h2>
      <p className="subhead">Data transfers received by {user.orgName}.</p>

      {error && (
        <div className="notice notice--error" role="alert" style={{ marginTop: 16 }}>
          <p>{error}</p>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="inbox-card skeleton-card">
              <div className="skeleton" style={{ height: 20, width: "40%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: "60%" }} />
            </div>
          ))
        ) : transfers.length === 0 ? (
          <div className="notice" role="status">
            <p className="notice-title">No transfers yet</p>
            <p className="muted-text" style={{ marginTop: 4 }}>
              When another organization sends data to {user.orgName}, it will appear here.
            </p>
          </div>
        ) : (
          <div className="inbox-list">
            {transfers.map((t) => {
              const date = new Date(t.transferredAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              });
              const isExpanded = expandedId === t.id;

              return (
                <div key={t.id} className="inbox-card">
                  <div
                    className="inbox-card-header"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    role="button"
                    aria-expanded={isExpanded}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setExpandedId(isExpanded ? null : t.id)}
                  >
                    <div>
                      <p className="inbox-org">
                        <span className="org-dot" />
                        From <strong>{t.fromOrgName}</strong>
                      </p>
                      <p className="muted-text" style={{ fontSize: 13, marginTop: 2 }}>
                        {date} &middot; {t.rowCount.toLocaleString()} records transferred
                      </p>
                    </div>
                    <span className="expand-icon">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {isExpanded && (
                    <div className="inbox-card-body">
                      <div className="inbox-meta-row">
                        <span className="inbox-label">From</span>
                        <span>{t.fromOrgName} ({t.fromOrgEmail})</span>
                      </div>
                      <div className="inbox-meta-row">
                        <span className="inbox-label">Records</span>
                        <span>{t.rowCount.toLocaleString()} rows</span>
                      </div>
                      <div className="inbox-meta-row">
                        <span className="inbox-label">Date</span>
                        <span>{date}</span>
                      </div>
                      {t.message && (
                        <div className="inbox-message">
                          <p className="inbox-label" style={{ marginBottom: 6 }}>Message</p>
                          <p className="inbox-message-text">{t.message}</p>
                        </div>
                      )}
                      <a href="/dashboard" className="btn" style={{ display: "inline-block", marginTop: 12, fontSize: 14 }}>
                        View Data in Dashboard →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
