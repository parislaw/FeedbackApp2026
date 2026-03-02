import React from 'react';
import { FloresAnalysis } from '../types';

interface FloresAnalysisPanelProps {
  floresAnalysis: FloresAnalysis;
}

// Badge for assessment grounding quality
const GroundingBadge = ({ quality }: { quality: FloresAnalysis['assessmentsFound'][number]['groundingQuality'] }) => {
  const styles: Record<typeof quality, string> = {
    'well-grounded': 'bg-green-100 text-green-800 border-green-200',
    'partially-grounded': 'bg-amber-100 text-amber-800 border-amber-200',
    'ungrounded': 'bg-red-100 text-red-800 border-red-200',
  };
  const labels: Record<typeof quality, string> = {
    'well-grounded': 'Well-Grounded', 'partially-grounded': 'Partially Grounded', 'ungrounded': 'Ungrounded'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[quality]}`}>
      {labels[quality]}
    </span>
  );
};

export const FloresAnalysisPanel: React.FC<FloresAnalysisPanelProps> = ({ floresAnalysis }) => (
  <div className="border border-slate-200 rounded-2xl p-6 mb-8 bg-slate-50">
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
      Speech Act Analysis <span className="font-normal text-slate-400 normal-case tracking-normal">(Flores)</span>
    </h3>

    {/* Assertions */}
    <div className="mb-5">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
        Assertions <span className="font-normal text-slate-400 normal-case">— factual, verifiable claims</span>
      </p>
      {floresAnalysis.assertionsFound.length === 0 ? (
        <p className="text-xs text-red-600 italic">No factual assertions identified in this conversation.</p>
      ) : (
        <div className="space-y-2">
          {floresAnalysis.assertionsFound.map((a, i) => (
            <div key={i} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-slate-100">
              <span className={`mt-0.5 text-xs font-bold shrink-0 ${a.isVerifiable ? 'text-green-600' : 'text-amber-600'}`}>
                {a.isVerifiable ? '✓' : '~'}
              </span>
              <span className="text-sm text-slate-700 italic">"{a.text}"</span>
              <span className={`ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded border ${a.isVerifiable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {a.isVerifiable ? 'Verifiable' : 'Subjective'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Assessments */}
    <div className="mb-5">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
        Assessments <span className="font-normal text-slate-400 normal-case">— opinions/judgments</span>
      </p>
      {floresAnalysis.assessmentsFound.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No assessments identified.</p>
      ) : (
        <div className="space-y-2">
          {floresAnalysis.assessmentsFound.map((a, i) => (
            <div key={i} className="bg-white rounded-lg px-3 py-2 border border-slate-100 space-y-1.5">
              <p className="text-sm text-slate-700 italic">"{a.text}"</p>
              <div className="flex flex-wrap items-center gap-2">
                <GroundingBadge quality={a.groundingQuality} />
                <span className={`text-xs px-1.5 py-0.5 rounded border ${a.hasStandard ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {a.hasStandard ? '✓ Standard' : '✗ No Standard'}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${a.hasEvidence ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {a.hasEvidence ? '✓ Evidence' : '✗ No Evidence'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Concern */}
    <div>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Receiver Concern Addressed</p>
      <div className="bg-white rounded-lg px-3 py-3 border border-slate-100 flex gap-3">
        <span className={`text-lg shrink-0 ${floresAnalysis.concernAddressed ? 'text-green-600' : 'text-red-500'}`}>
          {floresAnalysis.concernAddressed ? '✓' : '✗'}
        </span>
        <p className="text-sm text-slate-600">{floresAnalysis.concernNotes}</p>
      </div>
    </div>
  </div>
);
