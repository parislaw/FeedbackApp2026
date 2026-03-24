/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EvaluationReport } from './EvaluationReport';
import type { SavedReport, EvaluationReport as EvaluationReportType } from '../types';

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
        <div className="space-y-4">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    {r.scenarioTitle || 'Custom Scenario'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {r.provider} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-blue-600 text-sm font-medium shrink-0">View →</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
