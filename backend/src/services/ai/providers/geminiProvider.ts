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
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    console.log(`[GeminiProvider] 📡 Calling model="${modelName}" | maxOutputTokens=${request.maxTokens ?? 1000}`);

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

      console.log(`[GeminiProvider] 📨 Raw response received | length=${rawContent?.length ?? 0} chars | latency=${latencyMs}ms`);

      if (!rawContent) {
        console.error('[GeminiProvider] ❌ Empty response content from Gemini API');
        throw new AIGenerationError('Gemini response returned empty content.', this.name);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawContent);
        console.log('[GeminiProvider] ✅ JSON parsed successfully');
      } catch (parseError) {
        console.error('[GeminiProvider] ❌ JSON parse failed:', parseError);
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
          console.error('[GeminiProvider] ❌ Zod validation failed:', result.error.message);
          throw new AIGenerationError(
            `Gemini output failed Zod schema validation: ${result.error.message}`,
            this.name,
            result.error.issues
          );
        }
        validatedData = result.data;
        console.log('[GeminiProvider] ✅ Zod schema validation passed');
      } else {
        validatedData = parsed as T;
      }

      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

      console.log(
        `[GeminiProvider] 🏁 Done | inputTokens=${inputTokens} | outputTokens=${outputTokens} | latency=${latencyMs}ms | model="${modelName}"`
      );

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
      console.error(`[GeminiProvider] ❌ Unexpected error: ${message}`);
      throw new AIGenerationError(message, this.name, error);
    }
  }
}
