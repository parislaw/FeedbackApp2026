import React from 'react';
import { EvaluationReport as EvaluationReportType, GainRecommendation } from '../types';
import { GainAnalysisPanel } from './gain-analysis-panel';
import { FloresAnalysisPanel } from './flores-analysis-panel';

interface EvaluationReportProps {
  report: EvaluationReportType;
  onReset: () => void;
}

// Normalize scores: v1/legacy (absent scoreVersion) = 0-3 scale → multiply; v2 = already 0-100
const normalizeScore = (score: number, scoreVersion?: number): number =>
  scoreVersion === 1 || !scoreVersion
    ? Math.round(score * 33.3)
    : Math.round(score);

const getScoreColor = (score: number, scoreVersion?: number) => {
  const n = normalizeScore(score, scoreVersion);
  if (n >= 75) return 'text-green-600 bg-green-50 border-green-200';
  if (n >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
  return 'text-amber-600 bg-amber-50 border-amber-200';
};

const getEmoji = (score: number, scoreVersion?: number) => {
  const n = normalizeScore(score, scoreVersion);
  if (n >= 75) return '✨';
  if (n >= 50) return '👍';
  return '🌱';
};

const bandColor: Record<string, string> = {
  'Exemplary': 'text-green-700 bg-green-50',
  'Strong': 'text-emerald-700 bg-emerald-50',
  'Proficient': 'text-blue-700 bg-blue-50',
  'Developing': 'text-amber-700 bg-amber-50',
  'Needs Work': 'text-red-700 bg-red-50',
};

// Maps AI-returned dimension names to display labels with GAIN letter tags
const formatDimension = (dim: string): string => {
  const d = dim.toLowerCase();
  if (d.includes('goal')) return '[G] Goal Framing';
  if (d.includes('observation')) return '[A] Observation Quality';
  if (d.includes('self-acknowledgment') || d.includes('self acknowledgment') || d.includes('giver self')) return '[A] Self-Acknowledgment';
  if (d.includes('impact')) return '[I] Impact Articulation';
  if (d.includes('next action')) return '[N] Next Actions';
  return dim; // dialogue quality and any unrecognized dimensions pass through unchanged
};

export const EvaluationReport: React.FC<EvaluationReportProps> = ({ report, onReset }) => {
  const { scoreVersion } = report;
  // Detect legacy string-array recommendations for backward compatibility
  const isLegacyRec = report.recommendations.length > 0 && typeof (report.recommendations[0] as unknown) === 'string';

  // Overall score: prefer AI-computed overallScore, fall back to client avg
  const displayOverall = report.overallScore != null
    ? Math.round(report.overallScore)
    : report.giverScores.length > 0
      ? Math.round(report.giverScores.reduce((s, x) => s + normalizeScore(x.score, scoreVersion), 0) / report.giverScores.length)
      : null;
  const displayBand = report.overallBand || null;
  const overallColor = displayOverall != null
    ? displayOverall >= 75 ? 'text-green-700 border-green-300 bg-green-50'
    : displayOverall >= 60 ? 'text-blue-700 border-blue-300 bg-blue-50'
    : displayOverall >= 40 ? 'text-amber-700 border-amber-300 bg-amber-50'
    : 'text-red-700 border-red-300 bg-red-50'
    : 'text-slate-600 border-slate-200 bg-slate-50';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Performance Report</h1>
        <p className="text-slate-500 mb-6">Annual Feedback Calibration Summary</p>

        {/* Overall score hero */}
        {displayOverall != null && (
          <div className={`flex items-center gap-6 border rounded-2xl px-6 py-5 mb-8 ${overallColor}`}>
            <div className="text-5xl font-extrabold">{displayOverall}</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-0.5">Overall Score</p>
              {displayBand && <p className="text-lg font-semibold">{displayBand}</p>}
              {report.resistanceDecreased != null && (
                <p className="text-xs mt-1 opacity-70">
                  {report.resistanceDecreased ? '✓ Persona resistance decreased' : '✗ Persona resistance unchanged'}
                </p>
              )}
              {report.assertionsCited != null && report.assertionsCited.length > 0 && (
                <p className="text-xs mt-0.5 opacity-70">
                  Facts cited: #{report.assertionsCited.join(', #')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Score cards with GAIN letter prefixes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {report.giverScores.map((s, i) => (
            <div key={i} className={`p-4 border rounded-xl flex flex-col justify-between ${getScoreColor(s.score, scoreVersion)}`}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">{formatDimension(s.dimension)}</span>
                  <span>{getEmoji(s.score, scoreVersion)}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold">{normalizeScore(s.score, scoreVersion)}/100</span>
                  {s.band && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${bandColor[s.band] || 'text-slate-600 bg-slate-100'}`}>
                      {s.band}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs leading-relaxed opacity-90 mb-2">{s.feedback}</p>
              {s.evidenceQuotes && s.evidenceQuotes.length > 0 && (
                <div className="space-y-1 mt-1 border-t border-current border-opacity-20 pt-2">
                  {s.evidenceQuotes.map((q, qi) => (
                    <p key={qi} className="text-xs italic opacity-70 leading-relaxed">"{q}"</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* GAIN Analysis panel — only shown when present (new reports) */}
        {report.gainAnalysis && <GainAnalysisPanel gainAnalysis={report.gainAnalysis} />}
        {/* Flores Speech Act Analysis panel — only shown when present */}
        {report.floresAnalysis && <FloresAnalysisPanel floresAnalysis={report.floresAnalysis} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              What Worked Well
            </h3>
            <ul className="space-y-2">
              {report.summary.whatWorked.map((item, i) => (
                <li key={i} className="text-sm text-slate-600 flex gap-2">
                  <span className="text-green-500 font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Where it Broke Down
            </h3>
            <ul className="space-y-2">
              {report.summary.whatBrokeDown.map((item, i) => (
                <li key={i} className="text-sm text-slate-600 flex gap-2">
                  <span className="text-amber-500 font-bold">!</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-10">
          <h3 className="text-blue-800 font-bold mb-2 uppercase text-xs tracking-widest">Highest Leverage Improvement</h3>
          <p className="text-blue-900 font-medium italic">"{report.summary.highestLeverageImprovement}"</p>
        </div>

        {/* Recommendations: two-column issue/reframe cards (with legacy string fallback) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Development Recommendations</h3>
          <div className="grid gap-3">
            {isLegacyRec
              ? (report.recommendations as unknown as string[]).map((rec, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 border border-slate-100">
                    {rec}
                  </div>
                ))
              : (report.recommendations as GainRecommendation[]).map((rec, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-0 rounded-xl overflow-hidden border border-slate-200">
                    <div className="bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">What was said</p>
                      {rec.issue}
                    </div>
                    <div className="bg-blue-50 p-4 text-sm text-blue-900">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">GAIN reframe</p>
                      {rec.gainReframe}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onReset}
          className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
        >
          Practice Another Scenario
        </button>
      </div>
    </div>
  );
};
