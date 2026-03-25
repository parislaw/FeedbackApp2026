/// <reference types="vite/client" />
import React, { useState, useEffect, useCallback } from 'react';
import type { SavedReport, EvaluationReport as EvaluationReportType } from '../types';
import { EvaluationReport as EvaluationReportComponent } from './EvaluationReport';

const PAGE_SIZE = 20;

// Normalize scores: v1/legacy = 0-3 scale → multiply; v2 = already 0-100
function normalizeScore(score: number, scoreVersion?: number): number {
  return scoreVersion === 1 || !scoreVersion
    ? Math.round(score * 33.3)
    : Math.round(score);
}

// Color for 0-100 normalized scores: red→orange→yellow→green
function heatmapColor(score: number | null): string {
  if (score == null) return 'bg-slate-100 text-slate-400';
  if (score >= 75) return 'bg-green-100 text-green-800';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800';
  if (score >= 20) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

// Compute display score: prefer overallScore, fall back to normalized avg
function displayScoreValue(report: SavedReport): number | null {
  const ev = report.evaluation;
  if (!ev) return null;
  if (ev.overallScore != null) return Math.round(ev.overallScore);
  const scores = ev.giverScores;
  if (!scores || scores.length === 0) return null;
  const avg = scores.reduce((s, x) => s + normalizeScore(x.score, ev.scoreVersion), 0) / scores.length;
  return Math.round(avg);
}

// Build heatmap: { userId -> { userName, dims: { [dim]: normalizedScores[] } } }
function buildHeatmap(allReports: SavedReport[]) {
  const userMap: Record<string, { userName: string; dims: Record<string, number[]> }> = {};
  for (const r of allReports) {
    if (!r.evaluation?.giverScores) continue;
    const sv = r.evaluation.scoreVersion;
    if (!userMap[r.userId]) {
      userMap[r.userId] = { userName: r.userName || r.userId, dims: {} };
    }
    for (const s of r.evaluation.giverScores) {
      if (!userMap[r.userId].dims[s.dimension]) userMap[r.userId].dims[s.dimension] = [];
      userMap[r.userId].dims[s.dimension].push(normalizeScore(s.score, sv));
    }
  }
  return userMap;
}

// Extract all unique dimension names from reports
function extractDimensions(allReports: SavedReport[]): string[] {
  const dims = new Set<string>();
  for (const r of allReports) {
    for (const s of r.evaluation?.giverScores || []) dims.add(s.dimension);
  }
  return Array.from(dims);
}

function exportCsv(reports: SavedReport[]) {
  const dims = extractDimensions(reports);
  const header = ['userId', 'userName', 'userEmail', 'scenarioTitle', 'provider', 'date', ...dims.map((d) => `score_${d}`), 'overall_avg'];
  const rows = reports.map((r) => {
    const scoreMap: Record<string, string> = {};
    for (const s of r.evaluation?.giverScores || []) scoreMap[s.dimension] = s.score.toString();
    const avg = displayScoreValue(r);
    return [
      r.userId,
      r.userName || '',
      r.userEmail || '',
      r.scenarioTitle || '',
      r.provider || '',
      new Date(r.createdAt).toISOString().split('T')[0],
      ...dims.map((d) => scoreMap[d] || ''),
      avg != null ? avg.toFixed(2) : '',
    ];
  });

  const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function KpiBar({ allReports }: { allReports: SavedReport[] }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthReports = allReports.filter((r) => new Date(r.createdAt) >= startOfMonth);
  const recentReports = allReports.filter((r) => new Date(r.createdAt) >= thirtyDaysAgo);
  const activePractitioners = new Set(recentReports.map((r) => r.userId)).size;

  // Use displayScoreValue (prefers overallScore) for each report
  const reportDisplayScores = allReports.map(displayScoreValue).filter((s): s is number => s != null);
  const teamAvg = reportDisplayScores.length > 0
    ? `${Math.round(reportDisplayScores.reduce((a, b) => a + b, 0) / reportDisplayScores.length)}/100`
    : '—';

  // Hardest scenario: lowest avg displayScore by scenarioTitle
  const scenarioMap: Record<string, number[]> = {};
  for (const r of allReports) {
    const title = r.scenarioTitle || 'Custom';
    const s = displayScoreValue(r);
    if (s == null) continue;
    if (!scenarioMap[title]) scenarioMap[title] = [];
    scenarioMap[title].push(s);
  }
  const hardest = Object.entries(scenarioMap).length > 0
    ? Object.entries(scenarioMap).reduce((a, b) => {
        const aAvg = a[1].reduce((s, x) => s + x, 0) / a[1].length;
        const bAvg = b[1].reduce((s, x) => s + x, 0) / b[1].length;
        return aAvg <= bAvg ? a : b;
      })[0]
    : '—';

  const kpis = [
    { label: 'Sessions (this month)', value: thisMonthReports.length.toString() },
    { label: 'Active Practitioners (30d)', value: activePractitioners.toString() },
    { label: 'Team Avg Score', value: teamAvg },
    { label: 'Hardest Scenario', value: hardest },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {kpis.map((k) => (
        <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">{k.label}</p>
          <p className="text-lg font-bold text-slate-800 truncate">{k.value}</p>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ allReports }: { allReports: SavedReport[] }) {
  const dims = extractDimensions(allReports);
  const heatmap = buildHeatmap(allReports);
  const users = Object.entries(heatmap);

  if (users.length === 0 || dims.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
      <h4 className="font-semibold text-slate-700 text-sm px-4 py-3 border-b border-slate-100">Team Score Heatmap</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2 min-w-[140px]">User</th>
              {dims.map((d) => (
                <th key={d} className="px-3 py-2 text-center min-w-[90px]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(([uid, { userName, dims: userDims }]) => (
              <tr key={uid}>
                <td className="px-4 py-2 font-medium text-slate-700 truncate max-w-[140px]">{userName}</td>
                {dims.map((d) => {
                  const vals = userDims[d];
                  // vals are already normalized in buildHeatmap
                  const normAvg = vals && vals.length > 0
                    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
                    : null;
                  return (
                    <td key={d} className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${heatmapColor(normAvg)}`}>
                        {normAvg != null ? normAvg : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportDrawer({ report, onClose }: { report: SavedReport; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <p className="font-semibold text-slate-800">{report.scenarioTitle || 'Custom Scenario'}</p>
            <p className="text-xs text-slate-400">{report.userName} · {report.provider} · {new Date(report.createdAt).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold ml-4">✕</button>
        </div>
        <div className="p-6">
          {report.evaluation ? (
            <EvaluationReportComponent
              report={report.evaluation as EvaluationReportType}
              onReset={onClose}
            />
          ) : (
            <p className="text-slate-400 text-sm">No evaluation data for this report.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const AdminReportsTab: React.FC = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [allReports, setAllReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  const loadReports = useCallback((p: number) => {
    setIsLoading(true);
    fetch(`/api/admin/reports?page=${p}`)
      .then((r) => r.json())
      .then((d) => {
        setReports(d.reports || []);
        setHasMore((d.reports?.length || 0) >= PAGE_SIZE);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Load all reports for heatmap + KPIs + CSV (once on mount)
  useEffect(() => {
    fetch('/api/admin/reports?all=true')
      .then((r) => r.json())
      .then((d) => setAllReports(d.reports || []))
      .finally(() => setIsLoadingAll(false));
  }, []);

  useEffect(() => { loadReports(page); }, [page, loadReports]);

  return (
    <div className="space-y-4">
      {/* KPI Bar */}
      {!isLoadingAll && allReports.length > 0 && <KpiBar allReports={allReports} />}

      {/* Heatmap */}
      {!isLoadingAll && allReports.length > 0 && <Heatmap allReports={allReports} />}

      {/* Reports table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">All Reports</h3>
          {allReports.length > 0 && (
            <button
              onClick={() => exportCsv(allReports)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>

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
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => {
                  const score = displayScoreValue(r);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReport(r)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.userName}</p>
                        <p className="text-xs text-slate-400">{r.userEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.scenarioTitle || 'Custom'}</td>
                      <td className="px-4 py-3 text-slate-500">{r.provider || '—'}</td>
                      <td className="px-4 py-3">
                        {score != null ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${score >= 75 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {score}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Report detail drawer */}
      {selectedReport && (
        <ReportDrawer report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
};
