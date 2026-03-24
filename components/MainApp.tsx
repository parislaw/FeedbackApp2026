/// <reference types="vite/client" />
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SCENARIOS } from '../constants';
import { Scenario, Message, EvaluationReport as EvaluationReportType, PracticeMode, AIProvider } from '../types';
import { ScenarioCard } from './ScenarioCard';
import { ChatInterface } from './ChatInterface';
import { VoiceInterface } from './VoiceInterface';
import { EvaluationReport } from './EvaluationReport';
import { CustomScenarioForm } from './CustomScenarioForm';
import { EvidenceFilePanel } from './EvidenceFilePanel';
import { UploadFeedbackView } from './UploadFeedbackView';
import { getAIService } from '../services/aiServiceFactory';
import { authClient } from '../lib/auth-client';

type SessionUser = { id: string; name: string; email: string; role?: string | null };

export const MainApp: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationReportType | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(PracticeMode.Text);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(AIProvider.Gemini);
  const [showUploadView, setShowUploadView] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user) setSessionUser(data.user as SessionUser);
    });
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
    } catch {
      alert('Failed to generate custom scenario. Please try a different description.');
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const handleChatComplete = async (finalTranscript: Message[]) => {
    setTranscript(finalTranscript);
    setIsEvaluating(true);
    try {
      if (currentScenario && finalTranscript?.length) {
        const report = await aiService.evaluateTranscript(currentScenario, finalTranscript);
        setEvaluation(report);
        setSaveStatus('idle');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Report generation failed: ${msg}. Please try again.`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!evaluation) return;
    setSaveStatus('saving');
    try {
      const r = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: currentScenario?.id,
          scenarioTitle: currentScenario?.title,
          provider: selectedProvider,
          transcript,
          evaluation,
        }),
      });
      setSaveStatus(r.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = '/login'; // full reload clears all local state
  };

  const handleReset = () => {
    setCurrentScenario(null);
    setEvaluation(null);
    setTranscript([]);
    setIsCreatingCustom(false);
    setSaveStatus('idle');
  };

  const isAdmin = sessionUser?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">A</div>
            <span className="font-bold text-slate-800 tracking-tight">Accord <span className="text-slate-400 font-medium">Feedback Practice</span></span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-500">
            <button onClick={handleReset} className="hover:text-blue-600 transition-colors">Dashboard</button>
            <Link to="/reports" className="hover:text-blue-600 transition-colors">My Reports</Link>
            {isAdmin && <Link to="/admin" className="hover:text-blue-600 transition-colors">Admin</Link>}
            <label className="flex items-center gap-2">
              <span className="text-slate-500">AI:</span>
              <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value as AIProvider)} className="border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white focus:ring-2 focus:ring-blue-500">
                <option value={AIProvider.Gemini}>Gemini</option>
                <option value={AIProvider.Anthropic}>Anthropic</option>
                <option value={AIProvider.OpenAI}>OpenAI</option>
              </select>
            </label>
            <button onClick={handleLogout} className="hover:text-red-600 transition-colors">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-12">
        {showUploadView && <UploadFeedbackView provider={selectedProvider} onBack={() => setShowUploadView(false)} />}

        {!showUploadView && !currentScenario && !evaluation && !isEvaluating && !isCreatingCustom && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Calibrate Your Feedback Skills</h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">Select a high-fidelity scenario or create your own custom situation to practice giving constructive feedback.</p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button onClick={() => setIsCreatingCustom(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-sm"><span className="text-xl">+</span> Create Custom Scenario</button>
                <button onClick={() => setShowUploadView(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">📤 Upload for feedback</button>
                <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                  <button onClick={() => setPracticeMode(PracticeMode.Text)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${practiceMode === PracticeMode.Text ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>📝 Text Mode</button>
                  <button onClick={() => setPracticeMode(PracticeMode.Voice)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${practiceMode === PracticeMode.Voice ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>🎤 Voice Mode</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {SCENARIOS.map(s => <ScenarioCard key={s.id} scenario={s} onSelect={handleScenarioSelect} />)}
            </div>
          </div>
        )}

        {!showUploadView && isCreatingCustom && <CustomScenarioForm onGenerate={handleCustomGenerate} onCancel={() => setIsCreatingCustom(false)} isGenerating={isGeneratingScenario} />}

        {!showUploadView && currentScenario && !evaluation && !isEvaluating && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <button onClick={handleReset} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium text-sm">← Change Scenario</button>
              <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value as AIProvider)} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white">
                <option value={AIProvider.Gemini}>Gemini</option>
                <option value={AIProvider.Anthropic}>Anthropic</option>
                <option value={AIProvider.OpenAI}>OpenAI</option>
              </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {practiceMode === PracticeMode.Text
                  ? <ChatInterface scenario={currentScenario} aiService={aiService} onComplete={handleChatComplete} />
                  : <VoiceInterface scenario={currentScenario} onComplete={handleChatComplete} />}
              </div>
              <div className="space-y-6 sticky top-4 self-start">
                <EvidenceFilePanel assertions={currentScenario.assertions || []} />
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                  <h3 className="font-bold mb-2">Persona Strategy</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{currentScenario.persona.name} is {currentScenario.persona.difficulty.toLowerCase()} difficulty.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!showUploadView && isEvaluating && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-slate-800">Calibrating Report...</h2>
            <p className="text-slate-500 mt-2">The AI is analyzing your conversation against the GAIN framework.</p>
          </div>
        )}

        {!showUploadView && evaluation && !isEvaluating && (
          <div>
            <div className="max-w-4xl mx-auto mb-4 flex justify-end">
              <button
                onClick={handleSaveReport}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white cursor-default' : saveStatus === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed'}`}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? 'Save Failed — Retry' : 'Save Report'}
              </button>
            </div>
            <EvaluationReport report={evaluation} onReset={handleReset} />
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-500 py-12 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-sm">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-2 text-white">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-md">A</div>
              <span className="font-bold tracking-tight">Accord</span>
            </div>
            <p>© 2026 Accord. Feedback Practice Environment.</p>
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
