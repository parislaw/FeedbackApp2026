
import Anthropic from '@anthropic-ai/sdk';
import { Message, Scenario, EvaluationReport, Role, Difficulty, AIService, ChatSession } from '../types';

class AnthropicChatSession implements ChatSession {
  private client: Anthropic;
  private systemPrompt: string;
  private history: { role: 'user' | 'assistant'; content: string }[];

  constructor(client: Anthropic, systemPrompt: string) {
    this.client = client;
    this.systemPrompt = systemPrompt;
    this.history = [];
  }

  async sendMessage(message: string): Promise<string> {
    this.history.push({ role: 'user', content: message });

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: this.history,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    this.history.push({ role: 'assistant', content: text });
    return text;
  }
}

export class AnthropicService implements AIService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set');
      }
      this.client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
    return this.client;
  }

  async generateCustomScenario(userDescription: string): Promise<Scenario> {
    const prompt = `
      Create a highly detailed and psychologically distinct professional feedback simulation scenario based on this specific description: "${userDescription}"

      The scenario should be designed for a "Feedback Giver" (the user).

      Requirements for Uniqueness:
      1. AVOID GENERIC ARCHETYPES. Do not just create "Defensive Derek" or "Lazy Larry". Instead, delve into the specific interpersonal friction mentioned in the user's description.
      2. PROFESSIONAL TITLE: Create a realistic, industry-specific title.
      3. PROBLEM DESCRIPTION: Synthesize the user's input into a professional challenge.
      4. USER CONTEXT: Define the user's relationship to the persona (e.g., "You are their technical mentor who lacks formal authority but is responsible for their output").
      5. COMPLEX PERSONA:
         - NAME: A realistic name.
         - ROLE DESCRIPTION: Detailed professional background.
         - DIFFICULTY: Easy, Medium, or Hard based on the interpersonal complexity described.
         - DISTINCT CHARACTERISTICS: 3-5 traits that go beyond surface labels. Include conversational habits (e.g., "Uses technical jargon to mask insecurity"), motivational drivers (e.g., "Deeply fears being seen as incompetent"), and specific behavioral ticks (e.g., "Nods reflexively but doesn't take notes").

      The goal is a persona that feels like a real, complicated human being with a specific perspective on the conflict described.

      Return ONLY a JSON object with this exact structure (no markdown, no code fences):
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "role": "Giver",
        "context": "string",
        "persona": {
          "id": "string",
          "name": "string",
          "roleDescription": "string",
          "difficulty": "Easy" | "Medium" | "Hard",
          "characteristics": ["string"]
        }
      }
    `;

    const response = await this.getClient().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    const result = JSON.parse(text);
    result.id = `custom-${Date.now()}`;
    result.role = Role.Giver;
    return result as Scenario;
  }

  async createPersonaChat(scenario: Scenario): Promise<ChatSession> {
    const assertionsList = scenario.assertions.map((a, i) => `${i + 1}. ${a}`).join('\n');
    const voiceBlock = scenario.persona.voiceExamples?.length
      ? `## HOW YOU SPEAK\nSpeak in this voice. These are example phrases in your natural register:\n${scenario.persona.voiceExamples.map(e => `- "${e}"`).join('\n')}`
      : '';
    const backgroundBlock = scenario.personaBackground
      ? `## YOUR PRIVATE CONTEXT RIGHT NOW\n${scenario.personaBackground}`
      : '';
    const emotionalArc = scenario.persona.difficulty === 'Easy'
      ? 'Open and seeking clarity — you\'re not hostile, just want to understand.'
      : scenario.persona.difficulty === 'Hard'
      ? 'Resistant. You may only partially concede at the very end, and only if backed by 3+ specific facts.'
      : 'Defensive. Concede only after 2+ grounded, fact-based exchanges.';

    const systemInstruction = `ACT AS: ${scenario.persona.name} — you are a real person, not an AI.

## WHO YOU ARE
${scenario.persona.roleDescription}

${backgroundBlock}

## THE FACTS IN PLAY
These facts exist in the situation. Do NOT recite them unprompted — but when the user cites one, react from your private narrative above.
${assertionsList}

## YOUR TRAITS (let these drive your reactions)
${scenario.persona.characteristics.join(', ')}

${voiceBlock}

## BEHAVIORAL RULES
1. OPENING: You just sat down. You know roughly why. Start with 1-2 sentences — natural, in-character, slightly guarded.
2. ASSERTIONS: When the user cites a specific fact from the list above, react from your private context — don't pretend it's news unless it genuinely would be.
3. EMOTIONAL ARC: ${emotionalArc}
4. CONCESSION THRESHOLD: Only lower your guard when the user has cited at least 2 specific facts, articulated the impact, and offered a path forward.
5. NEVER break character. NEVER be educational. NEVER apologize for being difficult.
6. LENGTH: 2-4 sentences per response. Speak like a colleague in Slack — not a therapist.`;

    return new AnthropicChatSession(this.getClient(), systemInstruction);
  }

  async evaluateTranscript(scenario: Scenario, transcript: Message[]): Promise<EvaluationReport> {
    const assertionsList = scenario.assertions.map((a, i) => `${i + 1}. ${a}`).join('\n');
    const prompt = `
      Evaluate the following feedback conversation transcript where the user was the "Feedback Giver".
      Scenario: ${scenario.title}
      Context: ${scenario.context}

      AVAILABLE ASSERTIONS (facts the user could have cited):
      ${assertionsList}

      Transcript:
      ${transcript.map(m => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.text}`).join('\n')}

      SCORING RUBRICS — score each dimension 0-3:
      1. Standard clarity: 0=none stated, 1=vague, 2=referenced a standard, 3=specific measurable standard with source
      2. Specificity of assertions: 0=no facts cited, 1=vague reference, 2=1-2 specific facts cited, 3=3+ assertions cited with precision
      3. Quality of grounding: 0=pure judgment, 1=weak evidence, 2=mostly fact-based, 3=clean fact vs judgment separation throughout
      4. Impact articulation: 0=none, 1=vague impact stated, 2=team impact with example, 3=business+team impact with specific example
      5. Emotional regulation: 0=aggressive or combative, 1=frustrated tone, 2=professional, 3=compassionate and direct
      6. Commitment quality: 0=no next step proposed, 1=vague next step, 2=specific ask, 3=concrete next step with timeframe

      ALSO EVALUATE:
      - Which assertion numbers (from the list above) did the user actually cite in the conversation?
      - Was the GAIN framework followed? (Goal → Action → Impact → Next Action)
      - Did the persona's resistance visibly decrease by the end? (signals the user achieved a breakthrough)

      Definitions:
      - Assertions: Verifiable facts (e.g., "DEV-231 was late").
      - Assessments: Judgments (e.g., "You are sloppy" = bad; "Code lacked tests per our 80% standard" = good grounded assessment).
      - GAIN: Goal, Action, Impact, Next Action.

      Return ONLY a JSON object with this exact structure (no markdown, no code fences):
      {
        "giverScores": [
          { "dimension": "string", "score": 0, "feedback": "string" }
        ],
        "summary": {
          "whatWorked": ["string"],
          "whatBrokeDown": ["string"],
          "highestLeverageImprovement": "string"
        },
        "recommendations": ["string"]
      }
    `;

    const response = await this.getClient().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    const result = JSON.parse(text);
    return result as EvaluationReport;
  }
}

export const anthropicService = new AnthropicService();
