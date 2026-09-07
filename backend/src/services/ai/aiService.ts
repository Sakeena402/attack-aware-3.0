import { Types } from 'mongoose';
import { AIProvider, AIGenerationRequest, AIGenerationResult } from './aiProvider.interface.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { AnthropicProvider } from './providers/anthropicProvider.js';
import { AIGenerationLog, AIGenerationPurpose } from '../../models/AIGenerationLog.js';
import { AIGenerationError } from './aiGenerationError.js';

export interface AIServiceOptions {
  purpose: AIGenerationPurpose;
  relatedEntityId?: Types.ObjectId | string;
}

class AIService {
  private getProvider(): AIProvider {
    const providerName = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    if (providerName === 'anthropic') {
      return new AnthropicProvider();
    }
    return new OpenAIProvider();
  }

  public async generateStructured<T>(
    request: AIGenerationRequest<T>,
    options: AIServiceOptions
  ): Promise<AIGenerationResult<T>> {
    const provider = this.getProvider();
    const startTime = Date.now();

    try {
      const result = await provider.generateStructured<T>(request);

      // Async fire-and-forget log
      this.logCall({
        provider: result.provider,
        model: result.model,
        purpose: options.purpose,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
        success: true,
        relatedEntityId: options.relatedEntityId
          ? new Types.ObjectId(options.relatedEntityId.toString())
          : undefined,
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Generation error';
      const providerName = error instanceof AIGenerationError && error.provider ? error.provider : provider.name;

      // Async fire-and-forget failure log
      this.logCall({
        provider: providerName,
        model: process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || 'unknown',
        purpose: options.purpose,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        success: false,
        errorMessage,
        relatedEntityId: options.relatedEntityId
          ? new Types.ObjectId(options.relatedEntityId.toString())
          : undefined,
      });

      throw error;
    }
  }

  private logCall(logData: {
    provider: string;
    model: string;
    purpose: AIGenerationPurpose;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    relatedEntityId?: Types.ObjectId;
  }): void {
    Promise.resolve().then(async () => {
      try {
        await AIGenerationLog.create(logData);
      } catch (err) {
        console.error('[AIService] Failed to create AIGenerationLog:', err);
      }
    });
  }
}

export const aiService = new AIService();
