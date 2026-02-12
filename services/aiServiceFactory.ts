
import { AIProvider, AIService } from '../types';
import { ApiClientService } from './api-client-service';

export interface ProviderStatus {
  available: boolean;
  envVar: string;
}

// Cache service instances
const serviceCache: Record<AIProvider, ApiClientService> = {
  [AIProvider.Gemini]: new ApiClientService('Gemini'),
  [AIProvider.Anthropic]: new ApiClientService('Anthropic'),
  [AIProvider.OpenAI]: new ApiClientService('OpenAI'),
};

export function getProviderStatus(provider: AIProvider): ProviderStatus {
  // After migration to serverless, keys are server-side only
  // All providers are assumed available; errors will surface on API call
  const envVarMap: Record<AIProvider, string> = {
    [AIProvider.Gemini]: 'GEMINI_API_KEY',
    [AIProvider.Anthropic]: 'ANTHROPIC_API_KEY',
    [AIProvider.OpenAI]: 'OPENAI_API_KEY',
  };
  return { available: true, envVar: envVarMap[provider] };
}

export function getAllProviderStatuses(): Record<AIProvider, ProviderStatus> {
  return {
    [AIProvider.Gemini]: getProviderStatus(AIProvider.Gemini),
    [AIProvider.Anthropic]: getProviderStatus(AIProvider.Anthropic),
    [AIProvider.OpenAI]: getProviderStatus(AIProvider.OpenAI),
  };
}

export function getAIService(provider: AIProvider): AIService {
  return serviceCache[provider];
}
