
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { Message, Scenario, EvaluationReport, Role, Difficulty, AIService, ChatSession } from '../types';

class GeminiChatSession implements ChatSession {
  private chat: Chat;

  constructor(chat: Chat) {
    this.chat = chat;
  }

  async sendMessage(message: string): Promise<string> {
    const response = await this.chat.sendMessage({ message });
    return response.text;
  }
}

export class GeminiService implements AIService {
  private ai: GoogleGenAI | null = null;

  private getAI(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
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

      Return the result as a JSON object matching the Scenario interface.
    `;

    const response = await this.getAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            role: { type: Type.STRING, enum: ['Giver', 'Receiver'] },
            context: { type: Type.STRING },
            persona: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                roleDescription: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
                characteristics: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['id', 'name', 'roleDescription', 'difficulty', 'characteristics']
            }
          },
          required: ['id', 'title', 'description', 'role', 'context', 'persona']
        }
      }
    });

    const result = JSON.parse(response.text);
    // Ensure ID is unique and role is Giver for Phase 1
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

    const chat = this.getAI().chats.create({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    return new GeminiChatSession(chat);
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

      Return the evaluation in a structured JSON format.
    `;

    const response = await this.getAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            giverScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dimension: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  feedback: { type: Type.STRING }
                },
                required: ['dimension', 'score', 'feedback']
              }
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                whatWorked: { type: Type.ARRAY, items: { type: Type.STRING } },
                whatBrokeDown: { type: Type.ARRAY, items: { type: Type.STRING } },
                highestLeverageImprovement: { type: Type.STRING }
              },
              required: ['whatWorked', 'whatBrokeDown', 'highestLeverageImprovement']
            },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['giverScores', 'summary', 'recommendations']
        }
      }
    });

    const result = JSON.parse(response.text);
    return result as EvaluationReport;
  }
}

export const geminiService = new GeminiService();
