/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EvaluationReport } from './EvaluationReport';
import type { SavedReport, EvaluationReport as EvaluationReportType } from '../types';

// Normalize scores: v1/legacy = 0-3 scale → multiply; v2 = already 0-100
function normalizeScore(score: number, scoreVersion?: number): number {
  return scoreVersion === 1 || !scoreVersion
    ? Math.round(score * 33.3)
    : Math.round(score);
}

// Compute display score for a report: prefer overallScore, fall back to avg of giverScores
function displayScore(report: SavedReport): number | null {
  const ev = report.evaluation;
  if (!ev) return null;
  if (ev.overallScore != null) return Math.round(ev.overallScore);
  const scores = ev.giverScores;
  if (!scores || scores.length === 0) return null;
  const avg = scores.reduce((s, x) => s + normalizeScore(x.score, ev.scoreVersion), 0) / scores.length;
  return Math.round(avg);
}

// Color class based on 0-100 score value
function scoreColorClass(score: number): string {
  if (score >= 75) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

// Highlight phrases in text — returns array of JSX spans
function HighlightedText({ text, amber, green }: { text: string; amber: string[]; green: string[] }) {
  // Build a flat list of segments with their highlight type
  type Segment = { text: string; highlight: 'amber' | 'green' | null };
  const segments: Segment[] = [{ text, highlight: null }];

  const applyHighlights = (phrases: string[], color: 'amber' | 'green') => {
    for (const phrase of phrases) {
      if (!phrase.trim()) continue;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.highlight !== null) continue;
        const idx = seg.text.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx === -1) continue;
        const before = seg.text.slice(0, idx);
        const match = seg.text.slice(idx, idx + phrase.length);
        const after = seg.text.slice(idx + phrase.length);
        const replacement: Segment[] = [];
        if (before) replacement.push({ text: before, highlight: null });
        replacement.push({ text: match, highlight: color });
        if (after) replacement.push({ text: after, highlight: null });
        segments.splice(i, 1, ...replacement);
        break;
      }
    }
  };

  applyHighlights(amber, 'amber');
  applyHighlights(green, 'green');

  return (
    <>
      {segments.map((seg, i) =>
        seg.highlight === 'amber' ? (
          <mark key={i} className="bg-amber-100 text-amber-800 rounded px-0.5">{seg.text}</mark>
        ) : seg.highlight === 'green' ? (
          <mark key={i} className="bg-green-100 text-green-800 rounded px-0.5">{seg.text}</mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

function KpiStrip({ reports }: { reports: SavedReport[] }) {
  if (reports.length < 2) return null;

  const totalSessions = reports.length;

  // Use displayScore (prefers overallScore) for avg KPI
  const reportScores = reports.map(displayScore).filter((s): s is number => s != null);
  const overallAvg = reportScores.length > 0
    ? Math.round(reportScores.reduce((a, b) => a + b, 0) / reportScores.length)
    : null;

  // Per-dimension averages (normalized per report's scoreVersion)
  const dimMap: Record<string, number[]> = {};
  for (const r of reports) {
    for (const s of r.evaluation?.giverScores || []) {
      if (!dimMap[s.dimension]) dimMap[s.dimension] = [];
      dimMap[s.dimension].push(normalizeScore(s.score, r.evaluation?.scoreVersion));
    }
  }
  const dimAvgs = Object.entries(dimMap).map(([dim, vals]) => ({
    dim,
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));

  const best = dimAvgs.length > 0 ? dimAvgs.reduce((a, b) => (a.avg >= b.avg ? a : b)) : null;
  const focus = dimAvgs.length > 0 ? dimAvgs.reduce((a, b) => (a.avg <= b.avg ? a : b)) : null;

  const kpis = [
    { label: 'Sessions Practiced', value: totalSessions.toString(), accent: 'text-blue-600' },
    { label: 'Avg Score', value: overallAvg != null ? `${overallAvg}/100` : '—', accent: 'text-slate-800' },
    { label: 'Best Dimension', value: best?.dim || '—', accent: 'text-green-600' },
    { label: 'Focus Area', value: focus?.dim || '—', accent: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {kpis.map((k) => (
        <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">{k.label}</p>
          <p className={`text-xl font-bold truncate ${k.accent}`}>{k.value}</p>
        </div>
      ))}
    </div>
  );
}

function TranscriptSection({ report }: { report: SavedReport }) {
  const [open, setOpen] = useState(false);
  const transcript = report.transcript;
  if (!transcript || transcript.length === 0) return null;

  const amber = report.evaluation?.gainAnalysis?.judgmentsUsed || [];
  const green = report.evaluation?.gainAnalysis?.strongObservations || [];

  return (
    <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors"
      >
        <span>View Transcript</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 p-4 space-y-3">
          {amber.length > 0 && (
            <div className="flex gap-4 text-xs text-slate-500 pb-3">
              <span><mark className="bg-amber-100 text-amber-800 rounded px-1">Amber</mark> = judgment phrases</span>
              <span><mark className="bg-green-100 text-green-800 rounded px-1">Green</mark> = strong observations</span>
            </div>
          )}
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {msg.role === 'user' ? (
                  <HighlightedText text={msg.text} amber={amber} green={green} />
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ReportHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reports')
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load reports');
        const data = await r.json();
        setReports(data.reports);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedReport?.evaluation) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => setSelectedReport(null)}
          className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium text-sm"
        >
          ← Back to Report History
        </button>
        <div className="mb-4 text-sm text-slate-500">
          <span className="font-medium">{selectedReport.scenarioTitle || 'Custom Scenario'}</span>
          {' · '}
          {selectedReport.provider}
          {' · '}
          {new Date(selectedReport.createdAt).toLocaleDateString()}
        </div>
        <EvaluationReport
          report={selectedReport.evaluation as EvaluationReportType}
          onReset={() => setSelectedReport(null)}
        />
        <TranscriptSection report={selectedReport} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
        <button
          onClick={() => navigate('/')}
          className="text-slate-500 hover:text-blue-600 text-sm font-medium"
        >
          ← Dashboard
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">No saved reports yet.</p>
          <p className="text-sm mt-2">Complete a scenario and save your evaluation to see it here.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Practicing
          </button>
        </div>
      ) : (
        <>
          <KpiStrip reports={reports} />
          <div className="space-y-4">
            {reports.map((r) => {
              const score = displayScore(r);
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {r.scenarioTitle || 'Custom Scenario'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {r.provider} · {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {score != null && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreColorClass(score)}`}>
                          {score.toFixed(1)}
                        </span>
                      )}
                      <span className="text-blue-600 text-sm font-medium">View →</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
