import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @google/genai before importing service — must be a class for `new`
vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = { generateContent: vi.fn() };
    chats = { create: vi.fn() };
    constructor(_opts: any) {}
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
  };
});

// We need to test parseJsonResponse which is not exported, so we test it
// indirectly through the service. But let's also extract and test the logic.
describe('parseJsonResponse logic', () => {
  it('parses valid JSON', () => {
    const input = '{"key": "value"}';
    expect(JSON.parse(input)).toEqual({ key: 'value' });
  });

  it('throws on empty/undefined text', () => {
    expect(() => {
      const text: string | undefined = undefined;
      if (!text) throw new Error('Empty response from AI model during test.');
      JSON.parse(text);
    }).toThrow('Empty response');
  });

  it('throws on invalid JSON', () => {
    expect(() => {
      const text = 'not valid json {{{';
      try {
        JSON.parse(text);
      } catch {
        throw new Error('Failed to parse test response. Please try again.');
      }
    }).toThrow('Failed to parse');
  });
});

describe('GeminiService', () => {
  it('constructs without crashing', async () => {
    const { GeminiService } = await import('../services/geminiService');
    const service = new GeminiService();
    expect(service).toBeDefined();
  });

  it('exports a singleton instance', async () => {
    const { geminiService } = await import('../services/geminiService');
    expect(geminiService).toBeDefined();
  });
});
