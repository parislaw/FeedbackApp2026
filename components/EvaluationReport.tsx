
import React from 'react';
import { EvaluationReport as EvaluationReportType } from '../types';

interface EvaluationReportProps {
  report: EvaluationReportType;
  onReset: () => void;
}

export const EvaluationReport: React.FC<EvaluationReportProps> = ({ report, onReset }) => {
  const getScoreColor = (score: number) => {
    if (score >= 2.5) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 1.5) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getEmoji = (score: number) => {
    if (score >= 2.5) return '✨';
    if (score >= 1.5) return '👍';
    return '🌱';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Performance Report</h1>
        <p className="text-slate-500 mb-8">Annual Feedback Calibration Summary</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {report.giverScores.map((s, i) => (
            <div key={i} className={`p-4 border rounded-xl flex flex-col justify-between ${getScoreColor(s.score)}`}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">{s.dimension}</span>
                  <span>{getEmoji(s.score)}</span>
                </div>
                <div className="text-2xl font-bold mb-2">{s.score}/3</div>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{s.feedback}</p>
            </div>
          ))}
        </div>

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

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Development Recommendations</h3>
          <div className="grid gap-3">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 border border-slate-100">
                {rec}
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
