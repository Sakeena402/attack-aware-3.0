import { z } from 'zod';

export interface AIGenerationRequest<T = unknown> {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  schema?: z.ZodType<T>;
  maxTokens?: number;
}

export interface AIGenerationResult<T = unknown> {
  data: T;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface AIProvider {
  readonly name: string;
  generateStructured<T>(request: AIGenerationRequest<T>): Promise<AIGenerationResult<T>>;
}
