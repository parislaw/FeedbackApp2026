
import { AIProvider, AIService } from '../types';
import { geminiService } from './geminiService';
import { anthropicService } from './anthropicService';
import { openaiService } from './openaiService';

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
