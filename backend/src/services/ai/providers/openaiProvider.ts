import OpenAI from 'openai';
import { AIProvider, AIGenerationRequest, AIGenerationResult } from '../aiProvider.interface.js';
import { AIGenerationError } from '../aiGenerationError.js';

export class OpenAIProvider implements AIProvider {
  public readonly name = 'openai';

  public async generateStructured<T>(
    request: AIGenerationRequest<T>
  ): Promise<AIGenerationResult<T>> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIGenerationError('OPENAI_API_KEY is not configured in environment variables.', this.name);
    }

    const openai = new OpenAI({ apiKey });
    const startTime = Date.now();
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const systemPromptWithSchema = `${request.systemPrompt}\n\nYou MUST return valid JSON conforming to this schema:\n${JSON.stringify(
      request.responseSchema,
      null,
      2
    )}`;

    try {
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPromptWithSchema },
          { role: 'user', content: request.userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: request.maxTokens || 1000,
      });

      const latencyMs = Date.now() - startTime;
      const rawChoiceContent = completion.choices[0]?.message?.content;

      if (!rawChoiceContent) {
        throw new AIGenerationError('OpenAI response returned empty message content.', this.name);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawChoiceContent);
      } catch (parseError) {
        throw new AIGenerationError(
          'Failed to parse JSON response from OpenAI.',
          this.name,
          parseError
        );
      }

      let validatedData: T;
      if (request.schema) {
        const result = request.schema.safeParse(parsed);
        if (!result.success) {
          throw new AIGenerationError(
            `OpenAI output failed Zod schema validation: ${result.error.message}`,
            this.name,
            result.error.issues
          );
        }
        validatedData = result.data;
      } else {
        validatedData = parsed as T;
      }

      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;

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
      const message = error instanceof Error ? error.message : 'Unknown OpenAI generation error';
      throw new AIGenerationError(message, this.name, error);
    }
  }
}
