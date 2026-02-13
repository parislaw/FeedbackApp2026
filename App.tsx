
import React, { useState, useMemo, useEffect } from 'react';
import { SCENARIOS } from './constants';
import { Scenario, Message, EvaluationReport as EvaluationReportType, PracticeMode, AIProvider } from './types';
import { ScenarioCard } from './components/ScenarioCard';
import { ChatInterface } from './components/ChatInterface';
import { VoiceInterface } from './components/VoiceInterface';
import { EvaluationReport } from './components/EvaluationReport';
import { CustomScenarioForm } from './components/CustomScenarioForm';
import { EvidenceFilePanel } from './components/EvidenceFilePanel';
import { PasswordOverlay } from './components/PasswordOverlay';
import { getAIService } from './services/aiServiceFactory';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationReportType | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(PracticeMode.Text);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(AIProvider.Gemini);

  // Check if user is already authenticated from session storage
  useEffect(() => {
    const authenticated = sessionStorage.getItem('app-authenticated') === 'true';
    setIsAuthenticated(authenticated);
  }, []);

  const aiService = useMemo(() => getAIService(selectedProvider), [selectedProvider]);

  const handleScenarioSelect = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setEvaluation(null);
  };

  const handleCustomGenerate = async (description: string) => {
    setIsGeneratingScenario(true);
    try {
      const scenario = await aiService.generateCustomScenario(description);
      setCurrentScenario(scenario);
      setIsCreatingCustom(false);
    } catch (error) {
      console.error("Scenario generation error:", error);
      alert("Failed to generate custom scenario. Please try a different description.");
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const handleChatComplete = async (finalTranscript: Message[]) => {
    setTranscript(finalTranscript);
    setIsEvaluating(true);
    try {
      if (currentScenario) {
        if (!finalTranscript || finalTranscript.length === 0) {
          alert("No transcript to evaluate. Please ensure the conversation was recorded.");
          setIsEvaluating(false);
          return;
        }
        const report = await aiService.evaluateTranscript(currentScenario, finalTranscript);
        setEvaluation(report);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error("Evaluation error:", error);
      alert(`Report generation failed: ${errorMsg}. Please try again.`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setCurrentScenario(null);
    setEvaluation(null);
    setTranscript([]);
    setIsCreatingCustom(false);
  };

  if (!isAuthenticated) {
    return <PasswordOverlay onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">L</div>
            <span className="font-bold text-slate-800 tracking-tight">Lumenalta <span className="text-slate-400 font-medium">Feedback Practice</span></span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-500">
            <button onClick={handleReset} className="hover:text-blue-600 transition-colors">Dashboard</button>
            <label className="flex items-center gap-2">
              <span className="text-slate-500">AI:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={AIProvider.Gemini}>Gemini</option>
                <option value={AIProvider.Anthropic}>Anthropic</option>
                <option value={AIProvider.OpenAI}>OpenAI</option>
              </select>
            </label>
            <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Practice Mode</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12">
        {!currentScenario && !evaluation && !isEvaluating && !isCreatingCustom && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Calibrate Your Feedback Skills</h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
                Select a high-fidelity scenario or create your own custom situation to practice giving constructive feedback.
              </p>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsCreatingCustom(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-sm"
                >
                  <span className="text-xl">+</span> Create Custom Scenario
                </button>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                  <button
                    onClick={() => setPracticeMode(PracticeMode.Text)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${practiceMode === PracticeMode.Text ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    📝 Text Mode
                  </button>
                  <button
                    onClick={() => setPracticeMode(PracticeMode.Voice)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${practiceMode === PracticeMode.Voice ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    🎤 Voice Mode
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {SCENARIOS.map(s => (
                <ScenarioCard key={s.id} scenario={s} onSelect={handleScenarioSelect} />
              ))}
            </div>
          </div>
        )}

        {isCreatingCustom && (
          <CustomScenarioForm 
            onGenerate={handleCustomGenerate} 
            onCancel={() => setIsCreatingCustom(false)}
            isGenerating={isGeneratingScenario}
          />
        )}

        {currentScenario && !evaluation && !isEvaluating && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <button 
                onClick={handleReset}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium text-sm transition-colors"
              >
                ← Change Scenario
              </button>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                  <span className="text-xs font-bold text-slate-500 uppercase">Mode:</span>
                  <span className="text-xs font-bold text-blue-600">{practiceMode}</span>
                </div>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                  className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white"
                >
                  <option value={AIProvider.Gemini}>Gemini</option>
                  <option value={AIProvider.Anthropic}>Anthropic</option>
                  <option value={AIProvider.OpenAI}>OpenAI</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {practiceMode === PracticeMode.Text ? (
                  <ChatInterface scenario={currentScenario} aiService={aiService} onComplete={handleChatComplete} />
                ) : (
                  <VoiceInterface scenario={currentScenario} onComplete={handleChatComplete} />
                )}
              </div>
              
              <div className="space-y-6 sticky top-4 self-start">
                <EvidenceFilePanel assertions={currentScenario.assertions || []} />

                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                  <h3 className="font-bold mb-2">Persona Strategy</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {currentScenario.persona.name} is {currentScenario.persona.difficulty.toLowerCase()} difficulty.
                    Grounding your assessments in specific assertions is the best way to move the conversation forward.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl">
                  <h3 className="font-bold text-slate-800 mb-4">Practice Focus</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">G</div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Goal</p>
                        <p className="text-xs text-slate-500 leading-relaxed">State the expectation or standard clearly.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">A</div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Action</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Describe specific observable behavior (Assertions).</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">I</div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Impact</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Explain the effect on outcomes or team.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">N</div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Next Action</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Create commitment around future behavior.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isEvaluating && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-slate-800">Calibrating Report...</h2>
            <p className="text-slate-500 mt-2">The AI is analyzing your conversation against the GAIN framework.</p>
            <div className="mt-8 grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Analyzing Tone</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Extracting Grounding</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span> Scoring Assertions</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> Generating Recommendations</span>
            </div>
          </div>
        )}

        {evaluation && !isEvaluating && (
          <EvaluationReport report={evaluation} onReset={handleReset} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 py-12 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-sm">
          <div className="flex flex-col items-center md:items-start">
             <div className="flex items-center gap-2 mb-2 text-white">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-md">L</div>
              <span className="font-bold tracking-tight">Lumenalta</span>
            </div>
            <p>© 2024 Lumenalta Culture Lab. Private and Confidential Practice Environment.</p>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Framework Guide</a>
            <a href="#" className="hover:text-white transition-colors">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
