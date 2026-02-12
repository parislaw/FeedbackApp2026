// Factory for instantiating AI SDK clients using server-side environment variables only
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type Provider = 'Gemini' | 'Anthropic' | 'OpenAI';

const ENV_KEYS: Record<Provider, string> = {
  Gemini: 'GEMINI_API_KEY',
  Anthropic: 'ANTHROPIC_API_KEY',
  OpenAI: 'OPENAI_API_KEY',
};

function getKey(provider: Provider): string {
  const key = process.env[ENV_KEYS[provider]];
  if (!key) throw new Error(`${ENV_KEYS[provider]} not configured`);
  return key;
}

export function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getKey('Gemini') });
}

export function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: getKey('Anthropic') });
}

export function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getKey('OpenAI') });
}
