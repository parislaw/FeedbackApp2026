
import OpenAI from 'openai';
import { Message, Scenario, EvaluationReport, Role, Difficulty, AIService, ChatSession } from '../types';

const apiKey = process.env.OPENAI_API_KEY;

class OpenAIChatSession implements ChatSession {
  private client: OpenAI;
  private systemPrompt: string;
  private history: OpenAI.ChatCompletionMessageParam[];

  constructor(client: OpenAI, systemPrompt: string) {
    this.client = client;
    this.systemPrompt = systemPrompt;
    this.history = [{ role: 'system', content: systemPrompt }];
  }

  async sendMessage(message: string): Promise<string> {
    this.history.push({ role: 'user', content: message });

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: this.history,
      temperature: 0.8,
    });

    const text = response.choices[0]?.message?.content ?? '';
    this.history.push({ role: 'assistant', content: text });
    return text;
  }
}

export class OpenAIService implements AIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: apiKey!,
      dangerouslyAllowBrowser: true,
    });
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

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content ?? '{}';
    const result = JSON.parse(text);
    result.id = `custom-${Date.now()}`;
    result.role = Role.Giver;
    return result as Scenario;
  }

  async createPersonaChat(scenario: Scenario): Promise<ChatSession> {
    const systemInstruction = `
      ACT AS: ${scenario.persona.name}, a real person with the following profile:
      - ROLE: ${scenario.persona.roleDescription}
      - TRAITS: ${scenario.persona.characteristics.join(', ')}
      - DIFFICULTY: ${scenario.persona.difficulty} level of interpersonal resistance.

      CONTEXT:
      ${scenario.context}

      BEHAVIORAL GUIDELINES:
      1. INTERNAL MONOLOGUE: Before responding, consider your traits. If you are "insecure," be slightly defensive. If you "mask with jargon," use technical terms.
      2. REACTION TO FEEDBACK:
         - If the user is vague or moralizing (e.g., "You are being lazy"), push back or shut down.
         - If the user uses the GAIN framework (Goal, Action, Impact, Next Action) and grounds their assessments in assertions (verifiable facts), gradually lower your guard, but do so in a way that fits your persona (e.g., a "stubborn" person might only offer a small concession first).
      3. CONVERSATIONAL STYLE: Be concise (2-4 sentences). Do not lecture. Speak like a professional colleague in a Slack/Chat environment.
      4. MISSION: Be a realistic simulation of a human colleague, not a helpful AI assistant. Do not break character.
    `;

    return new OpenAIChatSession(this.client, systemInstruction);
  }

  async evaluateTranscript(scenario: Scenario, transcript: Message[]): Promise<EvaluationReport> {
    const prompt = `
      Evaluate the following feedback conversation transcript where the user was the "Feedback Giver".
      Scenario: ${scenario.title}
      Context: ${scenario.context}

      Transcript:
      ${transcript.map(m => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.text}`).join('\n')}

      Evaluate based on:
      1. Standard clarity (0-3)
      2. Specificity of assertions (0-3)
      3. Quality of grounding (0-3)
      4. Impact articulation (0-3)
      5. Emotional regulation (0-3)
      6. Commitment quality (0-3)

      Definitions:
      - Assertions: Verifiable facts (e.g., "Tickets DEV-231 was late").
      - Assessments: Judgments (e.g., "You are sloppy" - bad; "Code lacked tests per our 80% standard" - good).
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

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content ?? '{}';
    const result = JSON.parse(text);
    return result as EvaluationReport;
  }
}

export const openaiService = new OpenAIService();
