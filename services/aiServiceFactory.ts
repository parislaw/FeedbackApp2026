
import { AIProvider, AIService } from '../types';
import { geminiService } from './geminiService';
import { anthropicService } from './anthropicService';
import { openaiService } from './openaiService';

const API_KEY_MAP: Record<AIProvider, { key: string | undefined; envVar: string }> = {
  [AIProvider.Gemini]: { key: process.env.GEMINI_API_KEY, envVar: 'GEMINI_API_KEY' },
  [AIProvider.Anthropic]: { key: process.env.ANTHROPIC_API_KEY, envVar: 'ANTHROPIC_API_KEY' },
  [AIProvider.OpenAI]: { key: process.env.OPENAI_API_KEY, envVar: 'OPENAI_API_KEY' },
};

export interface ProviderStatus {
  available: boolean;
  envVar: string;
}

export function getProviderStatus(provider: AIProvider): ProviderStatus {
  const { key, envVar } = API_KEY_MAP[provider];
  return { available: !!key && key.length > 0, envVar };
}

export function getAllProviderStatuses(): Record<AIProvider, ProviderStatus> {
  return {
    [AIProvider.Gemini]: getProviderStatus(AIProvider.Gemini),
    [AIProvider.Anthropic]: getProviderStatus(AIProvider.Anthropic),
    [AIProvider.OpenAI]: getProviderStatus(AIProvider.OpenAI),
  };
}

export function getAIService(provider: AIProvider): AIService {
  switch (provider) {
    case AIProvider.Gemini:
      return geminiService;
    case AIProvider.Anthropic:
      return anthropicService;
    case AIProvider.OpenAI:
      return openaiService;
    default:
      return geminiService;
  }
}
