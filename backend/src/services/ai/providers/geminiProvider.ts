import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIGenerationRequest, AIGenerationResult } from '../aiProvider.interface.js';
import { AIGenerationError } from '../aiGenerationError.js';

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';

  public async generateStructured<T>(
    request: AIGenerationRequest<T>
  ): Promise<AIGenerationResult<T>> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIGenerationError('GEMINI_API_KEY is not configured in environment variables.', this.name);
    }

    const ai = new GoogleGenAI({ apiKey });
    const startTime = Date.now();
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: request.responseSchema,
          maxOutputTokens: request.maxTokens || 1000,
        },
      });

      const latencyMs = Date.now() - startTime;
      const rawContent = response.text;

      if (!rawContent) {
        throw new AIGenerationError('Gemini response returned empty content.', this.name);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        throw new AIGenerationError(
          'Failed to parse JSON response from Gemini.',
          this.name,
          parseError
        );
      }

      let validatedData: T;
      if (request.schema) {
        const result = request.schema.safeParse(parsed);
        if (!result.success) {
          throw new AIGenerationError(
            `Gemini output failed Zod schema validation: ${result.error.message}`,
            this.name,
            result.error.issues
          );
        }
        validatedData = result.data;
      } else {
        validatedData = parsed as T;
      }

      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

      return {
        data: validatedData,
        provider: this.name,
        model: modelName,
        inputTokens,
        outputTokens,
        latencyMs,
      };
    } catch (error) {
      if (error instanceof AIGenerationError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown Gemini generation error';
      throw new AIGenerationError(message, this.name, error);
    }
  }
}
