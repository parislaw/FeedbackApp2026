
import React from 'react';
import { Scenario, Difficulty } from '../types';

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onSelect }) => {
  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case Difficulty.Easy: return 'bg-green-100 text-green-700';
      case Difficulty.Medium: return 'bg-yellow-100 text-yellow-700';
      case Difficulty.Hard: return 'bg-red-100 text-red-700';
    }
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
      role="listitem"
      onClick={() => onSelect(scenario)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(scenario); } }}
      tabIndex={0}
      aria-label={`${scenario.title} scenario with ${scenario.persona.name}, ${scenario.persona.difficulty} difficulty`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-slate-800">{scenario.title}</h3>
        <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${getDifficultyColor(scenario.persona.difficulty)}`}>
          {scenario.persona.difficulty}
        </span>
      </div>
      <p className="text-slate-600 mb-6 flex-grow">{scenario.description}</p>
      
      <div className="bg-slate-50 p-4 rounded-lg">
        <p className="text-sm font-medium text-slate-500 mb-1">RECIPIENT PERSONA</p>
        <p className="text-slate-800 font-semibold">{scenario.persona.name}</p>
        <p className="text-xs text-slate-500 mt-1">{scenario.persona.roleDescription}</p>
      </div>

      <button className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
        Start Practice
      </button>
    </div>
  );
};
