import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIGenerationRequest, AIGenerationResult } from '../aiProvider.interface.js';
import { AIGenerationError } from '../aiGenerationError.js';

export class AnthropicProvider implements AIProvider {
  public readonly name = 'anthropic';

  public async generateStructured<T>(
    request: AIGenerationRequest<T>
  ): Promise<AIGenerationResult<T>> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIGenerationError('ANTHROPIC_API_KEY is not configured in environment variables.', this.name);
    }

    const anthropic = new Anthropic({ apiKey });
    const startTime = Date.now();
    const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    const toolName = 'submit_structured_output';

    try {
      const response = await anthropic.messages.create({
        model: modelName,
        max_tokens: request.maxTokens || 1000,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
        tools: [
          {
            name: toolName,
            description: 'Submit the generated structured response matching the requested schema.',
            input_schema: request.responseSchema as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: toolName },
      });

      const latencyMs = Date.now() - startTime;

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (!toolUseBlock) {
        throw new AIGenerationError(
          'Anthropic response did not contain the expected forced tool_use block.',
          this.name
        );
      }

      const parsed: unknown = toolUseBlock.input;

      let validatedData: T;
      if (request.schema) {
        const result = request.schema.safeParse(parsed);
        if (!result.success) {
          throw new AIGenerationError(
            `Anthropic output failed Zod schema validation: ${result.error.message}`,
            this.name,
            result.error.issues
          );
        }
        validatedData = result.data;
      } else {
        validatedData = parsed as T;
      }

      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;

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
      const message = error instanceof Error ? error.message : 'Unknown Anthropic generation error';
      throw new AIGenerationError(message, this.name, error);
    }
  }
}
