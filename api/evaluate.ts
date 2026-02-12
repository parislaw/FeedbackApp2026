// Serverless function: handles evaluation requests by routing to the correct AI provider
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Anthropic from '@anthropic-ai/sdk';
import { validateMethod, sendError } from './_lib/response-helpers';
import { getGeminiClient, getAnthropicClient, getOpenAIClient, Provider } from './_lib/provider-factory';
import { buildEvaluationPrompt } from './_lib/prompt-builder';
import type { EvaluationReport } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;

  try {
    const { provider, scenario, transcript } = req.body as {
      provider: Provider;
      scenario: {
        title: string;
        context: string;
        assertions: string[];
      };
      transcript: { role: string; text: string }[];
    };

    if (!provider || !scenario || !transcript?.length) {
      return sendError(res, 400, 'Missing required fields: provider, scenario, transcript');
    }

    const evaluationPrompt = buildEvaluationPrompt(
      scenario.title,
      scenario.context,
      scenario.assertions,
      transcript
    );
    let evaluationJson: unknown;

    switch (provider) {
      case 'Gemini': {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
          config: { temperature: 0.3, responseMimeType: 'application/json' },
        });
        try {
          evaluationJson = JSON.parse(response.text ?? '{}');
        } catch {
          return sendError(res, 500, 'Failed to parse AI response as JSON');
        }
        break;
      }
      case 'Anthropic': {
        const client = getAnthropicClient();
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1500,
          messages: [{ role: 'user', content: evaluationPrompt }],
        });
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');
        try {
          evaluationJson = JSON.parse(text);
        } catch {
          return sendError(res, 500, 'Failed to parse AI response as JSON');
        }
        break;
      }
      case 'OpenAI': {
        const client = getOpenAIClient();
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: evaluationPrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });
        const text = response.choices[0]?.message?.content ?? '{}';
        try {
          evaluationJson = JSON.parse(text);
        } catch {
          return sendError(res, 500, 'Failed to parse AI response as JSON');
        }
        break;
      }
      default:
        return sendError(res, 400, `Unknown provider: ${provider}`);
    }

    const report = evaluationJson as EvaluationReport;
    return res.status(200).json(report);
  } catch (error) {
    console.error('Evaluate API error:', error);
    // Sanitize error messages to avoid exposing internal details
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = message.includes('API key') || message.includes('authentication');
    const safeMessage = isAuthError ? 'Authentication failed' : 'Failed to evaluate response';
    return sendError(res, 500, safeMessage);
  }
}
