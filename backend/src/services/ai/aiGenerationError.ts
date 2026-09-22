export class AIGenerationError extends Error {
  public readonly provider?: string;
  public readonly details?: unknown;

  constructor(message: string, provider?: string, details?: unknown) {
    super(message);
    this.name = 'AIGenerationError';
    this.provider = provider;
    this.details = details;
    Object.setPrototypeOf(this, AIGenerationError.prototype);
  }
}
