"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { useDemoSession } from "../components/demo-session-provider";

type DataRow = {
  id: string;
  colA: string;
  colB: string;
  colC: string;
  createdAt: string;
  sourceTransferId: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useDemoSession();

  const [rows, setRows] = useState<DataRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchRows = useCallback(async (page: number) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rows?page=${page}&limit=50`);
      if (!res.ok) {
        if (res.status === 401) { router.replace("/login"); return; }
        throw new Error("Failed to load data.");
      }
      const data = await res.json();
      setRows(data.rows);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!sessionLoading && !user) router.replace("/login");
  }, [user, sessionLoading, router]);

  useEffect(() => {
    if (user) fetchRows(currentPage);
  }, [user, currentPage, fetchRows]);

  const handleAddRow = async () => {
    setIsAdding(true);
    setError("");
    try {
      const res = await fetch("/api/rows", { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to add row.");
      }
      // Refresh current page to show the new row
      await fetchRows(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add row.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRow = async (id: string) => {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/rows/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to delete row.");
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (pagination) {
        setPagination((p) => p ? { ...p, total: p.total - 1, totalPages: Math.ceil((p.total - 1) / p.limit) } : p);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete row.");
    } finally {
      setDeletingId(null);
    }
  };

  if (sessionLoading || !user) return null;

  return (
    <AppShell email={user.email} orgName={user.orgName}>
      {/* ── Header ── */}
      <div className="dashboard-header">
        <div>
          <h2 className="headline-sm">Data Dashboard</h2>
          <p className="muted-text">
            {pagination ? (
              <>
                <span className="row-count-badge">{pagination.total.toLocaleString()} rows</span>
                {" "}&middot; {user.orgName}
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>
        <button
          className="btn"
          onClick={handleAddRow}
          disabled={isAdding}
          id="add-row-btn"
        >
          {isAdding ? "Adding…" : "+ Add Row"}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="notice notice--error" role="alert" style={{ marginBottom: 16 }}>
          <p>{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>Name</th>
              <th>Department</th>
              <th>Status</th>
              <th style={{ width: 80 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="skeleton" /></td>
                  <td><div className="skeleton" /></td>
                  <td><div className="skeleton" /></td>
                  <td><div className="skeleton" /></td>
                  <td><div className="skeleton" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No rows yet. Click &ldquo;+ Add Row&rdquo; to get started.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="data-row">
                  <td className="row-num">
                    {((currentPage - 1) * 50) + idx + 1}
                  </td>
                  <td>{row.colA}</td>
                  <td>{row.colB}</td>
                  <td>
                    <span className={`status-badge status-badge--${row.colC.toLowerCase().replace(/\s+/g, "-")}`}>
                      {row.colC}
                    </span>
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteRow(row.id)}
                      disabled={deletingId === row.id}
                      aria-label={`Delete row ${idx + 1}`}
                      id={`delete-row-${row.id}`}
                    >
                      {deletingId === row.id ? "…" : "✕"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Prev
          </button>
          <span className="muted-text">
            Page {currentPage} of {pagination.totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </AppShell>
  );
}
