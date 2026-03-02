import React from 'react';
import { GainAnalysis } from '../types';

interface GainAnalysisPanelProps {
  gainAnalysis: GainAnalysis;
}

const GoalFramingBadge = ({ value }: { value: GainAnalysis['goalFraming'] }) => {
  const styles: Record<GainAnalysis['goalFraming'], string> = {
    'gain-oriented': 'bg-green-100 text-green-800 border-green-200',
    'pain-oriented': 'bg-amber-100 text-amber-800 border-amber-200',
    missing: 'bg-red-100 text-red-800 border-red-200',
  };
  const labels: Record<GainAnalysis['goalFraming'], string> = {
    'gain-oriented': 'Gain-Oriented', 'pain-oriented': 'Pain-Oriented', missing: 'Missing'
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[value]}`}>{labels[value]}</span>;
};

const CompletenessBadge = ({ value }: { value: GainAnalysis['nextActionCompleteness'] }) => {
  const styles: Record<GainAnalysis['nextActionCompleteness'], string> = {
    complete: 'bg-green-100 text-green-800 border-green-200',
    vague: 'bg-amber-100 text-amber-800 border-amber-200',
    missing: 'bg-red-100 text-red-800 border-red-200',
  };
  const labels: Record<GainAnalysis['nextActionCompleteness'], string> = {
    complete: 'Complete', vague: 'Vague', missing: 'Missing'
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[value]}`}>{labels[value]}</span>;
};

const CheckIcon = ({ value }: { value: boolean }) => (
  <span className={value ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
    {value ? '✓' : '✗'}
  </span>
);

export const GainAnalysisPanel: React.FC<GainAnalysisPanelProps> = ({ gainAnalysis }) => (
  <div className="border border-slate-200 rounded-2xl p-6 mb-8 bg-slate-50">
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">GAIN Analysis</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
        <span className="text-sm text-slate-600">Goal Framing</span>
        <GoalFramingBadge value={gainAnalysis.goalFraming} />
      </div>
      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
        <span className="text-sm text-slate-600">Self-Acknowledgment</span>
        <CheckIcon value={gainAnalysis.selfAcknowledgment} />
      </div>
      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
        <span className="text-sm text-slate-600">Next Actions</span>
        <CompletenessBadge value={gainAnalysis.nextActionCompleteness} />
      </div>
      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
        <span className="text-sm text-slate-600">Check-in Scheduled</span>
        <CheckIcon value={gainAnalysis.checkInScheduled} />
      </div>
    </div>

    {gainAnalysis.judgmentsUsed?.length > 0 && (
      <div className="mb-3">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Judgment Language</p>
        <div className="flex flex-wrap gap-2">
          {gainAnalysis.judgmentsUsed.map((phrase, i) => (
            <span key={i} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-xs">
              "{phrase}"
            </span>
          ))}
        </div>
      </div>
    )}

    {gainAnalysis.strongObservations?.length > 0 && (
      <div>
        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Strong Observations</p>
        <div className="flex flex-wrap gap-2">
          {gainAnalysis.strongObservations.map((phrase, i) => (
            <span key={i} className="bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded text-xs">
              "{phrase}"
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);
