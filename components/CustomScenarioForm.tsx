
import React, { useState } from 'react';

interface CustomScenarioFormProps {
  onGenerate: (description: string) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export const CustomScenarioForm: React.FC<CustomScenarioFormProps> = ({ onGenerate, onCancel, isGenerating }) => {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onGenerate(description);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-4xl mx-auto overflow-hidden flex flex-col md:flex-row">
      {/* Guidance Side Panel */}
      <div className="md:w-1/3 bg-slate-50 p-8 border-b md:border-b-0 md:border-r border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">How to write a great description</h3>
        <div className="space-y-6">
          <section>
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Be Specific</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Describe observable behaviors rather than labels. Instead of "lazy," say "missed three consecutive standups."
            </p>
          </section>
          
          <section>
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Include Impact</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              What is the consequence? "Team morale is dropping" or "Client deliverables are at risk."
            </p>
          </section>

          <section className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2">Example</h4>
            <p className="text-[13px] text-slate-600 italic leading-relaxed">
              "A senior dev who is technically strong but interrupts others in meetings. They often justify it by saying we need to move faster. The team has stopped sharing ideas. I am their peer lead."
            </p>
          </section>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="md:w-2/3 p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Describe Your Scenario</h2>
        <p className="text-slate-500 mb-8">
          The more context you provide about the behavior and the persona's typical reactions, the more realistic the simulation will be.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Situation & Persona Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about the colleague, the specific issues, and the dynamic..."
              className="w-full h-48 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm shadow-inner"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-6 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !description.trim()}
              className="flex-[2] py-3 px-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg active:translate-y-0.5 transform"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Designing Simulation...
                </>
              ) : (
                'Generate Practice Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
