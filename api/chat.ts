// Serverless function: handles chat requests by routing to the correct AI provider
// Client sends full message history each time (stateless serverless pattern)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Anthropic from '@anthropic-ai/sdk';
import { validateMethod, sendError } from './_lib/response-helpers.js';
import { validateRateLimit } from './_lib/rate-limit.js';
import { getGeminiClient, getAnthropicClient, getOpenAIClient, Provider } from './_lib/provider-factory.js';
import { buildPersonaSystemPrompt } from './_lib/prompt-builder.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;
  if (!validateRateLimit(req, res)) return;

  try {
    const { provider, scenario, messages, stream: wantStream } = req.body as {
      provider: Provider;
      stream?: boolean;
      scenario: {
        persona: {
          name: string;
          roleDescription: string;
          difficulty: string;
          characteristics: string[];
          voiceExamples?: string[];
        };
        assertions: string[];
        personaBackground?: string;
      };
      messages: { role: string; text: string }[];
    };

    if (!provider || !scenario || !messages?.length) {
      return sendError(res, 400, 'Missing required fields: provider, scenario, messages');
    }

    const systemPrompt = buildPersonaSystemPrompt(scenario);
    let responseText: string;

    switch (provider) {
      case 'Gemini': {
        const ai = getGeminiClient();
        const contents = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));
        if (wantStream) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Transfer-Encoding', 'chunked');
          res.status(200);
          const stream = await ai.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents,
            config: { systemInstruction: systemPrompt, temperature: 0.8 },
          });
          for await (const chunk of stream) {
            const text = chunk.text ?? '';
            if (text) res.write(text);
          }
          res.end();
          return;
        }
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents,
          config: { systemInstruction: systemPrompt, temperature: 0.8 },
        });
        responseText = response.text ?? '';
        break;
      }
      case 'Anthropic': {
        const client = getAnthropicClient();
        const anthropicMessages = messages.map(m => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text,
        }));
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: systemPrompt,
          messages: anthropicMessages,
        });
        responseText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');
        break;
      }
      case 'OpenAI': {
        const client = getOpenAIClient();
        const openaiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...messages.map(m => ({
            role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.text,
          })),
        ];
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: openaiMessages,
          temperature: 0.8,
        });
        responseText = response.choices[0]?.message?.content ?? '';
        break;
      }
      default:
        return sendError(res, 400, `Unknown provider: ${provider}`);
    }

    return res.status(200).json({ message: responseText });
  } catch (error) {
    console.error('Chat API error:', error);
    // Sanitize error messages to avoid exposing internal details
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = message.includes('API key') || message.includes('authentication');
    const safeMessage = isAuthError ? 'Authentication failed' : 'Failed to generate response';
    return sendError(res, 500, safeMessage);
  }
}
