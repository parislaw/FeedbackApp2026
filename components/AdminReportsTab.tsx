/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import type { SavedReport } from '../types';

export const AdminReportsTab: React.FC = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const loadReports = (p: number) => {
    setIsLoading(true);
    fetch(`/api/admin/reports?page=${p}`)
      .then((r) => r.json())
      .then((d) => {
        setReports(d.reports || []);
        setHasMore((d.reports?.length || 0) >= PAGE_SIZE);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadReports(page); }, [page]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <h3 className="font-semibold text-slate-800 p-4 border-b border-slate-100">All Reports</h3>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-10">No reports saved yet.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Scenario</th>
                <th className="text-left px-4 py-3">Provider</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.userName}</p>
                    <p className="text-xs text-slate-400">{r.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.scenarioTitle || 'Custom'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.provider || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-slate-400">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-3 py-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
};
