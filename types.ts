
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard'
}

export enum Role {
  Giver = 'Giver',
  Receiver = 'Receiver'
}

export enum PracticeMode {
  Text = 'Text',
  Voice = 'Voice'
}

export enum AIProvider {
  Gemini = 'Gemini',
  Anthropic = 'Anthropic',
  OpenAI = 'OpenAI'
}

export interface ChatSession {
  sendMessage(message: string): Promise<string>;
  /** When present, use for streaming (e.g. Gemini). Same as sendMessage but calls onChunk with each delta. */
  sendMessageStreaming?(message: string, onChunk: (delta: string) => void): Promise<string>;
}

export interface AIService {
  generateCustomScenario(userDescription: string): Promise<Scenario>;
  createPersonaChat(scenario: Scenario): Promise<ChatSession>;
  evaluateTranscript(scenario: Scenario, transcript: Message[]): Promise<EvaluationReport>;
}

export interface Persona {
  id: string;
  name: string;
  roleDescription: string;
  difficulty: Difficulty;
  characteristics: string[];
  voiceExamples: string[]; // 2-3 example phrases in persona's actual voice
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  role: Role;
  context: string;
  assertions: string[];
  persona: Persona;
  personaBackground?: string; // Persona's private narrative about the situation (optional for custom scenarios)
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface EvaluationScore {
  dimension: string;
  score: number; // 0-3
  feedback: string;
}

export interface GainAnalysis {
  goalFraming: 'gain-oriented' | 'pain-oriented' | 'missing';
  selfAcknowledgment: boolean;
  judgmentsUsed: string[];       // exact phrases from transcript
  strongObservations: string[];  // exact phrases from transcript
  nextActionCompleteness: 'complete' | 'vague' | 'missing';
  checkInScheduled: boolean;
}

export interface GainRecommendation {
  issue: string;        // what they actually said/did
  gainReframe: string;  // verbatim GAIN-style alternative phrasing
}

export interface FloresAssertion {
  text: string;          // exact quote from transcript
  isVerifiable: boolean; // could be confirmed with objective evidence
}

export interface FloresAssessment {
  text: string;           // exact quote from transcript
  hasStandard: boolean;   // giver referenced an explicit expectation/benchmark
  hasEvidence: boolean;   // judgment backed by observable assertions
  groundingQuality: 'well-grounded' | 'partially-grounded' | 'ungrounded';
}

export interface FloresAnalysis {
  assertionsFound: FloresAssertion[];
  assessmentsFound: FloresAssessment[];
  concernAddressed: boolean;
  concernNotes: string; // what concern was present or absent
}

export interface EvaluationReport {
  giverScores: EvaluationScore[];
  summary: {
    whatWorked: string[];
    whatBrokeDown: string[];
    highestLeverageImprovement: string;
  };
  gainAnalysis?: GainAnalysis;    // optional for backward compat with old reports
  floresAnalysis?: FloresAnalysis; // optional for backward compat
  recommendations: GainRecommendation[];
}
