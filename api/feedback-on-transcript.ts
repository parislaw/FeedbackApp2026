// Serverless function: feedback on uploaded/pasted transcript (no scenario)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Anthropic from '@anthropic-ai/sdk';
import { validateMethod, sendError } from './_lib/response-helpers.js';
import { validateRateLimit } from './_lib/rate-limit.js';
import { getGeminiClient, getAnthropicClient, getOpenAIClient, Provider } from './_lib/provider-factory.js';
import { buildFeedbackOnTranscriptPrompt } from './_lib/prompt-builder.js';
import type { EvaluationReport } from '../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;
  if (!validateRateLimit(req, res)) return;

  try {
    const { provider, transcript: rawTranscript } = req.body as {
      provider: Provider;
      transcript: { role: string; text: string }[] | string;
    };

    if (!provider) {
      return sendError(res, 400, 'Missing required field: provider');
    }
    if (rawTranscript === undefined || rawTranscript === null) {
      return sendError(res, 400, 'Missing required field: transcript');
    }

    // Normalize: string from /api/transcribe → single turn; array = structured
    const transcript: { role: string; text: string }[] =
      typeof rawTranscript === 'string'
        ? [{ role: 'user', text: rawTranscript.trim() }]
        : rawTranscript;

    if (!transcript.length) {
      return sendError(res, 400, 'Transcript is empty');
    }

    const prompt = buildFeedbackOnTranscriptPrompt(transcript);
    let reportJson: unknown;

    switch (provider) {
      case 'Gemini': {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.3, responseMimeType: 'application/json' },
        });
        try {
          reportJson = JSON.parse(response.text ?? '{}');
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
          messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');
        try {
          reportJson = JSON.parse(text);
        } catch {
          return sendError(res, 500, 'Failed to parse AI response as JSON');
        }
        break;
      }
      case 'OpenAI': {
        const client = getOpenAIClient();
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });
        const text = response.choices[0]?.message?.content ?? '{}';
        try {
          reportJson = JSON.parse(text);
        } catch {
          return sendError(res, 500, 'Failed to parse AI response as JSON');
        }
        break;
      }
      default:
        return sendError(res, 400, `Unknown provider: ${provider}`);
    }

    const report = reportJson as EvaluationReport;
    return res.status(200).json(report);
  } catch (error) {
    console.error('Feedback-on-transcript API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = message.includes('API key') || message.includes('authentication');
    const safeMessage = isAuthError ? 'Authentication failed' : 'Failed to analyze transcript';
    return sendError(res, 500, safeMessage);
  }
}
