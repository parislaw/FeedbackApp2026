
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Message, Scenario } from '../types';

interface VoiceInterfaceProps {
  scenario: Scenario;
  onComplete: (transcript: Message[]) => void;
}

// Session type for Gemini Live API connection
interface LiveSession {
  sendRealtimeInput: (input: { media: { data: string; mimeType: string } }) => void;
  close: () => void;
}

// Window type extension for webkit audio context
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ scenario, onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [currentInputTranscription, setCurrentInputTranscription] = useState('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');

  // Helper functions for audio processing
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string): Uint8Array | null => {
    try {
      if (!/^[A-Za-z0-9+/]*=*$/.test(base64)) return null;
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch {
      return null;
    }
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const clamped = Math.max(-1, Math.min(1, data[i]));
      int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  // Helper to create AudioContext with webkit fallback
  const createAudioContext = (sampleRate: number): AudioContext => {
    const AudioContextConstructor =
      window.AudioContext || ((window as unknown as WebkitWindow).webkitAudioContext as typeof AudioContext);
    return new AudioContextConstructor({ sampleRate });
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let scriptProcessor: ScriptProcessorNode | null = null;

    const startSession = async () => {
      try {
        // Get API key from serverless endpoint (keeps key out of client source code)
        const credResponse = await fetch('/api/voice-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!credResponse.ok) {
          const errorData = await credResponse.json();
          throw new Error(errorData.error || 'Failed to obtain voice credentials');
        }

        const data = (await credResponse.json()) as unknown;
        if (!data || typeof data !== 'object' || !('token' in data)) {
          throw new Error('Invalid voice token response');
        }
        const { token } = data as { token: string; expiresAt?: string };
        if (!token || typeof token !== 'string') {
          throw new Error('Voice token missing');
        }
        const ai = new GoogleGenAI({ apiKey: token, apiVersion: 'v1alpha' });

        const inputAudioContext = createAudioContext(16000);
        const outputAudioContext = createAudioContext(24000);
        audioContextsRef.current = { input: inputAudioContext, output: outputAudioContext };

        // Request microphone access with proper permission handling
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (micError) {
          const errorMsg = micError instanceof Error ? micError.message : 'Microphone access denied';
          if (errorMsg.includes('NotAllowedError')) {
            throw new Error('Microphone permission denied. Please check your browser settings.');
          } else if (errorMsg.includes('NotFoundError')) {
            throw new Error('No microphone found. Please connect one and try again.');
          }
          throw new Error('Microphone error: ' + errorMsg);
        }

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              setIsActive(true);
              const source = inputAudioContext.createMediaStreamSource(stream!);
              scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              // Debug logging
              console.log('WebSocket message:', message);

              // Handle Transcriptions
              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                console.log('Output transcription:', text);
                currentOutputTranscriptionRef.current += text;
                setCurrentOutputTranscription(currentOutputTranscriptionRef.current);
              } else if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                console.log('Input transcription:', text);
                currentInputTranscriptionRef.current += text;
                setCurrentInputTranscription(currentInputTranscriptionRef.current);
              }

              if (message.serverContent?.turnComplete) {
                const userText = currentInputTranscriptionRef.current;
                const modelText = currentOutputTranscriptionRef.current;
                console.log('Turn complete. User:', userText, 'Model:', modelText);
                setTranscript(prev => {
                  const updated = [
                    ...prev,
                    { role: 'user', text: userText },
                    { role: 'model', text: modelText }
                  ];
                  console.log('Updated transcript:', updated);
                  return updated;
                });
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                setCurrentInputTranscription('');
                setCurrentOutputTranscription('');
              }

              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && audioContextsRef.current) {
                const decoded = decode(base64Audio);
                if (!decoded) return;
                const { output } = audioContextsRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, output.currentTime);
                const audioBuffer = await decodeAudioData(decoded, output, 24000, 1);
                const source = output.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(output.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              if (message.serverContent?.interrupted) {
                for (const s of sourcesRef.current.values()) {
                  try {
                    s.stop();
                    s.disconnect();
                  } catch (e) {}
                }
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e: unknown) => {
              console.error('Live API Error:', e);
              const errObj = e && typeof e === 'object' ? e as { error?: unknown; message?: string; reason?: string } : null;
              const err = errObj?.error;
              const msg =
                (err instanceof Error ? err.message : null) ??
                (typeof err === 'string' ? err : null) ??
                errObj?.message ??
                errObj?.reason ??
                (e instanceof Error ? e.message : null) ??
                'Voice connection failed. If this persists, try refreshing or check that your API key is valid.';
              setError(`Voice connection error: ${msg}`);
              setIsConnecting(false);
            },
            onclose: (e?: { code?: number; reason?: string }) => {
              console.log('WebSocket closed', e?.code, e?.reason);
              if (e?.code && e.code !== 1000) {
                const reason = e.reason || (e.code === 1006 ? 'Connection failed (often auth or network)' : `Code ${e.code}`);
                setError((prev) => prev || `Voice connection closed: ${reason}`);
                setIsConnecting(false);
              }
              setIsActive(false);
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: `
              ACT AS: ${scenario.persona.name}.
              ROLE: ${scenario.persona.roleDescription}
              TRAITS: ${scenario.persona.characteristics.join(', ')}
              CONTEXT: ${scenario.context}
              
              VOCAL PERSONALITY:
              1. VOCAL TONE: Embody your traits vocally. If "impatient," speak quickly. If "timid," use softer tones and pauses.
              2. REAL-TIME INTERACTION: This is a live voice conversation. React to pauses or interruptions.
              3. ADHERENCE TO PERSONA: Do not break character. Do not be helpful like an AI. 
              4. RESPONSE TO GAIN/ASSERTIONS:
                 - If the user uses the GAIN framework (Goal, Action, Impact, Next Action) or grounds their feedback in specific assertions (facts), slowly become more receptive.
                 - If they are vague, defensive, or moralizing, increase your interpersonal resistance according to your difficulty level (${scenario.persona.difficulty}).
              5. BREVITY: Keep spoken turns to 1-3 sentences. Let the user speak.
            `,
          },
        });

        sessionRef.current = await sessionPromise;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error("Failed to start voice session:", err);
        setError(errorMessage);
        setIsConnecting(false);
      }
    };

    startSession();

    return () => {
      if (scriptProcessor) {
        try {
          scriptProcessor.disconnect();
        } catch (e) {}
      }
      if (sessionRef.current) sessionRef.current.close();
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioContextsRef.current) {
        try {
          audioContextsRef.current.input.close();
          audioContextsRef.current.output.close();
        } catch (e) {}
      }
    };
  }, [scenario]);

  const handleEnd = () => {
    // Add any final un-committed transcript parts from refs
    const finalTranscript = [...transcript];
    if (currentInputTranscriptionRef.current || currentOutputTranscriptionRef.current) {
      finalTranscript.push(
        { role: 'user', text: currentInputTranscriptionRef.current },
        { role: 'model', text: currentOutputTranscriptionRef.current }
      );
    }
    const filtered = finalTranscript.filter(m => m.text.trim().length > 0);
    console.log('Voice session ended with transcript:', filtered.length, 'messages');
    if (filtered.length === 0) {
      alert('No conversation was recorded. Please speak to the persona and try again.');
      return;
    }
    onComplete(filtered);
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-64 h-64 border-8 border-blue-500 rounded-full animate-ping"></div>
      </div>

      <div className="p-6 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center z-10">
        <div>
          <h2 className="font-bold text-white text-lg">Voice Session: {scenario.persona.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <p className="text-xs text-slate-400 uppercase tracking-widest">{isActive ? 'Live' : 'Connecting...'}</p>
          </div>
        </div>
        <button 
          onClick={handleEnd}
          className="px-6 py-2 bg-white text-slate-900 rounded-full text-sm font-bold hover:bg-slate-200 transition-all shadow-lg"
        >
          End & Evaluate
        </button>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-12 text-center z-10">
        {error ? (
          <div className="space-y-4 max-w-md">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-500/30">
              <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <p className="text-red-400 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-all"
            >
              Retry
            </button>
          </div>
        ) : isConnecting ? (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 font-medium">Setting up secure audio channel...</p>
          </div>
        ) : (
          <div className="space-y-8 w-full max-w-md">
            <div className="relative">
              <div className="w-32 h-32 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-blue-500/30">
                <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              {/* Voice visualizer placeholder */}
              <div className="mt-8 flex justify-center items-end gap-1 h-8">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 bg-blue-500 rounded-full transition-all duration-100 ${isActive ? 'animate-bounce' : 'h-1'}`}
                    style={{ 
                      height: isActive ? `${Math.random() * 100}%` : '4px',
                      animationDelay: `${i * 0.05}s`
                    }}
                  ></div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-white text-lg font-medium">Speak naturally to {scenario.persona.name}</p>
              <div className="p-4 bg-slate-800 rounded-xl text-slate-400 text-sm italic min-h-[60px] flex items-center justify-center">
                {currentOutputTranscription || currentInputTranscription || "Listening..."}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-800/30 text-[10px] text-slate-500 text-center uppercase tracking-widest z-10">
        Audio is processed in real-time. Transcription is recorded for evaluation.
      </div>
    </div>
  );
};
