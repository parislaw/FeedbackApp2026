
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
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  role: Role;
  context: string;
  persona: Persona;
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

export interface EvaluationReport {
  giverScores: EvaluationScore[];
  summary: {
    whatWorked: string[];
    whatBrokeDown: string[];
    highestLeverageImprovement: string;
  };
  recommendations: string[];
}
