// Serverless function: handles custom scenario generation requests
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Anthropic from '@anthropic-ai/sdk';
import { validateMethod, sendError } from './_lib/response-helpers.js';
import { getGeminiClient, getAnthropicClient, getOpenAIClient, Provider } from './_lib/provider-factory.js';
import { buildCustomScenarioPrompt } from './_lib/prompt-builder.js';
import type { Scenario } from '../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;

  try {
    const { provider, description } = req.body as {
      provider: Provider;
      description: string;
    };

    if (!provider || !description) {
      return sendError(res, 400, 'Missing required fields: provider, description');
    }

    const prompt = buildCustomScenarioPrompt(description);
    let scenarioJson: unknown;

    switch (provider) {
      case 'Gemini': {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.7, responseMimeType: 'application/json' },
        });
        try {
          scenarioJson = JSON.parse(response.text ?? '{}');
        } catch {
          return sendError(res, 500, 'Failed to parse scenario as JSON');
        }
        break;
      }
      case 'Anthropic': {
        const client = getAnthropicClient();
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');
        try {
          scenarioJson = JSON.parse(text);
        } catch {
          return sendError(res, 500, 'Failed to parse scenario as JSON');
        }
        break;
      }
      case 'OpenAI': {
        const client = getOpenAIClient();
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        });
        const text = response.choices[0]?.message?.content ?? '{}';
        try {
          scenarioJson = JSON.parse(text);
        } catch {
          return sendError(res, 500, 'Failed to parse scenario as JSON');
        }
        break;
      }
      default:
        return sendError(res, 400, `Unknown provider: ${provider}`);
    }

    const scenario = scenarioJson as Scenario;
    return res.status(200).json(scenario);
  } catch (error) {
    console.error('Scenario API error:', error);
    // Sanitize error messages to avoid exposing internal details
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = message.includes('API key') || message.includes('authentication');
    const safeMessage = isAuthError ? 'Authentication failed' : 'Failed to generate scenario';
    return sendError(res, 500, safeMessage);
  }
}
