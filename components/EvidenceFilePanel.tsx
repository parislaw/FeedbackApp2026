import React, { useState } from 'react';

interface EvidenceFilePanelProps {
  assertions: string[];
}

export const EvidenceFilePanel: React.FC<EvidenceFilePanelProps> = ({ assertions }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyAssertion = (assertion: string, index: number) => {
    navigator.clipboard.writeText(assertion).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  };

  if (!assertions || assertions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">Evidence File</h3>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Click to Copy</span>
      </div>
      <div className="space-y-2">
        {assertions.map((assertion, index) => (
          <button
            key={index}
            onClick={() => handleCopyAssertion(assertion, index)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <span className="text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-0.5">
              {copiedIndex === index ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
            </span>
            <p className="text-xs text-slate-600 group-hover:text-slate-800 leading-relaxed">
              {assertion}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
