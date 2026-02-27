import React, { useState, useRef } from 'react';
import { EvaluationReport as EvaluationReportType } from '../types';
import { EvaluationReport } from './EvaluationReport';
import { ApiClientService } from '../services/api-client-service';

const MAX_AUDIO_MB = 5;
const api = new ApiClientService('Gemini');

interface UploadFeedbackViewProps {
  provider: string;
  onBack: () => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export const UploadFeedbackView: React.FC<UploadFeedbackViewProps> = ({ provider, onBack }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EvaluationReportType | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const transcriptInputRef = useRef<HTMLInputElement>(null);

  const hasInput = Boolean(audioFile || transcriptText.trim() || transcriptFile);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasInput) {
      setError('Please provide an audio file or paste/upload a transcript.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let transcript: string;
      if (audioFile) {
        if (audioFile.size > MAX_AUDIO_MB * 1024 * 1024) {
          setError(`Audio file must be under ${MAX_AUDIO_MB}MB.`);
          setLoading(false);
          return;
        }
        const base64 = await readFileAsBase64(audioFile);
        const mime = audioFile.type || 'audio/webm';
        transcript = await api.transcribeAudio(provider, base64, mime);
      } else if (transcriptFile) {
        transcript = await readFileAsText(transcriptFile);
      } else {
        transcript = transcriptText.trim();
      }
      if (!transcript) {
        setError('Transcript is empty after processing.');
        setLoading(false);
        return;
      }
      const feedbackReport = await api.feedbackOnTranscript(provider, transcript);
      setReport(feedbackReport);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setReport(null);
    setAudioFile(null);
    setTranscriptText('');
    setTranscriptFile(null);
    setError(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (transcriptInputRef.current) transcriptInputRef.current.value = '';
  };

  if (report) {
    return (
      <div className="max-w-4xl mx-auto">
        <EvaluationReport report={report} onReset={() => { handleResetForm(); onBack(); }} />
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-6 py-2 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50"
          >
            Analyze another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium text-sm"
        >
          ← Back to dashboard
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Upload for feedback</h1>
        <p className="text-slate-500 mb-8">
          Upload an audio recording of a feedback conversation or paste a transcript to get feedback and phrasing recommendations.
        </p>

        <form onSubmit={handleAnalyze} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Audio recording (optional)</label>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/webm,audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
            />
            <p className="text-xs text-slate-400 mt-1">Max {MAX_AUDIO_MB}MB. MP3, WAV, M4A, WebM.</p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Or paste / upload transcript</label>
            <textarea
              value={transcriptText}
              onChange={(e) => { setTranscriptText(e.target.value); setTranscriptFile(null); }}
              placeholder="Paste your feedback conversation transcript here..."
              rows={8}
              className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-2 flex items-center gap-4">
              <input
                ref={transcriptInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setTranscriptFile(file);
                    const text = await readFileAsText(file);
                    setTranscriptText(text);
                  }
                }}
                className="text-sm text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-200 file:bg-white file:text-slate-600"
              />
              {transcriptFile && (
                <span className="text-xs text-slate-500">{transcriptFile.name}</span>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm p-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !hasInput}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyzing…' : 'Analyze'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center py-8 border border-slate-100 rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Transcribing and analyzing…</p>
          </div>
        )}
      </div>
    </div>
  );
};
