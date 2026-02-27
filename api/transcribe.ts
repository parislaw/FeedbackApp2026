// Serverless function: transcribe audio to text using provider-specific speech-to-text APIs
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateMethod, sendError } from './_lib/response-helpers.js';
import { validateRateLimit } from './_lib/rate-limit.js';
import { getGeminiClient, getOpenAIClient, Provider } from './_lib/provider-factory.js';

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;
  if (!validateRateLimit(req, res)) return;

  try {
    const { provider, audio, audioMimeType } = req.body as {
      provider: Provider;
      audio: string; // base64-encoded
      audioMimeType: string;
    };

    // Validate inputs
    if (!provider || !audio || !audioMimeType) {
      return sendError(res, 400, 'Missing required fields: provider, audio, audioMimeType');
    }

    // Validate audio size (base64 is ~33% larger than binary, so adjust calculation)
    const audioBuffer = Buffer.from(audio, 'base64');
    if (audioBuffer.length > MAX_AUDIO_SIZE) {
      return sendError(res, 413, `Audio file exceeds 5MB limit (got ${Math.round(audioBuffer.length / 1024 / 1024)}MB)`);
    }

    // Validate MIME type
    const validMimeTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/webm'];
    if (!validMimeTypes.includes(audioMimeType.toLowerCase())) {
      return sendError(res, 400, `Unsupported audio format: ${audioMimeType}. Supported: mp3, wav, m4a, webm`);
    }

    let transcript: string;

    switch (provider) {
      case 'Gemini': {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Please transcribe the following audio and return only the transcribed text, without any additional commentary.' },
                {
                  inlineData: {
                    data: audio,
                    mimeType: audioMimeType,
                  },
                },
              ],
            },
          ],
          config: { temperature: 0 },
        });
        transcript = response.text ?? '';
        if (!transcript) {
          return sendError(res, 500, 'Failed to transcribe audio: empty response');
        }
        break;
      }

      case 'OpenAI': {
        const client = getOpenAIClient();
        // Convert base64 to buffer for OpenAI Whisper API
        const audioBuffer = Buffer.from(audio, 'base64');

        // Create a file-like object for OpenAI SDK
        const audioFile = new File([audioBuffer], 'audio.mp3', { type: audioMimeType });

        const response = await client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'en',
        });
        transcript = response.text ?? '';
        if (!transcript) {
          return sendError(res, 500, 'Failed to transcribe audio: empty response');
        }
        break;
      }

      case 'Anthropic': {
        // Anthropic doesn't have native speech-to-text; fall back to Gemini
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Please transcribe the following audio and return only the transcribed text, without any additional commentary.' },
                {
                  inlineData: {
                    data: audio,
                    mimeType: audioMimeType,
                  },
                },
              ],
            },
          ],
          config: { temperature: 0 },
        });
        transcript = response.text ?? '';
        if (!transcript) {
          return sendError(res, 500, 'Failed to transcribe audio: empty response');
        }
        break;
      }

      default:
        return sendError(res, 400, `Unknown provider: ${provider}`);
    }

    return res.status(200).json({
      transcript: transcript.trim(),
      status: 200,
    });
  } catch (error) {
    console.error('Transcribe API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = message.includes('API key') || message.includes('authentication') || message.includes('401');
    const safeMessage = isAuthError ? 'Authentication failed' : 'Failed to transcribe audio';
    return sendError(res, 500, safeMessage);
  }
}
