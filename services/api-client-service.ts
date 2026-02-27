// API Client Service - implements AIService interface using fetch() to serverless endpoints
// Replaces direct SDK usage on the client side
import type { AIService, ChatSession, Scenario, Message, EvaluationReport } from '../types';

class ApiChatSession implements ChatSession {
  private provider: string;
  private scenario: Scenario;
  private messages: Message[] = [];

  constructor(provider: string, scenario: Scenario) {
    this.provider = provider;
    this.scenario = scenario;
  }

  async sendMessage(message: string): Promise<string> {
    if (this.provider === 'Gemini') {
      return this.sendMessageStreaming(message, () => {});
    }
    return this.sendMessageNonStreaming(message);
  }

  async sendMessageStreaming(message: string, onChunk: (delta: string) => void): Promise<string> {
    this.messages.push({ role: 'user', text: message });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: this.provider,
          scenario: this.scenario,
          messages: this.messages,
          stream: this.provider === 'Gemini',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Chat API error: ${response.statusText}`);
      }

      const contentType = response.headers.get('Content-Type') ?? '';
      if (this.provider === 'Gemini' && contentType.includes('text/plain') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          onChunk(chunk);
        }
        this.messages.push({ role: 'model', text: full });
        return full;
      }

      const data = (await response.json()) as { message: string };
      this.messages.push({ role: 'model', text: data.message });
      return data.message;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('ChatSession.sendMessage error:', error);
      throw error;
    }
  }

  private async sendMessageNonStreaming(message: string): Promise<string> {
    this.messages.push({ role: 'user', text: message });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: this.provider,
          scenario: this.scenario,
          messages: this.messages,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Chat API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { message: string };
      this.messages.push({ role: 'model', text: data.message });
      return data.message;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Limit transcript to last 50 messages to manage payload size
  getTranscript(): Message[] {
    return this.messages.slice(-50);
  }
}

export class ApiClientService implements AIService {
  private provider: string;

  constructor(provider: string) {
    this.provider = provider;
  }

  async generateCustomScenario(userDescription: string): Promise<Scenario> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: this.provider,
          description: userDescription,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Scenario API error: ${response.statusText}`);
      }

      const scenario = (await response.json()) as Scenario;
      return scenario;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('generateCustomScenario error:', error);
      throw error;
    }
  }

  async createPersonaChat(scenario: Scenario): Promise<ChatSession> {
    // Stateless - just create a new chat session with empty message history
    return new ApiChatSession(this.provider, scenario);
  }

  async evaluateTranscript(scenario: Scenario, transcript: Message[]): Promise<EvaluationReport> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: this.provider,
          scenario: {
            title: scenario.title,
            context: scenario.context,
            assertions: scenario.assertions,
          },
          transcript,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Evaluation API error: ${response.statusText}`);
      }

      const report = (await response.json()) as EvaluationReport;
      return report;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('evaluateTranscript error:', error);
      throw error;
    }
  }

  /** Transcribe audio (base64) to text. Returns plain transcript string. */
  async transcribeAudio(provider: string, audioBase64: string, audioMimeType: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, audio: audioBase64, audioMimeType }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Transcribe API error: ${response.statusText}`);
      }
      const data = (await response.json()) as { transcript: string };
      return data.transcript;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  /** Get feedback report for a transcript (string or structured). */
  async feedbackOnTranscript(
    provider: string,
    transcript: string | { role: string; text: string }[]
  ): Promise<EvaluationReport> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch('/api/feedback-on-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, transcript }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Feedback API error: ${response.statusText}`);
      }
      return (await response.json()) as EvaluationReport;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
}

export const apiClientService = new ApiClientService('Gemini');
