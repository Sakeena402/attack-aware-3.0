// backend/src/models/SimulationEvent.ts
import { Schema, model, Document } from 'mongoose';

export type EventType =
  | 'sms_sent'
  | 'sms_delivered'
  | 'sms_failed'
  | 'link_clicked'
  | 'credentials_submitted'
  | 'phishing_reported'
  | 'call_initiated'
  | 'call_answered'
  | 'call_completed'
  | 'voice_engaged'
  | 'voice_verified'
  | 'voice_reported';

export interface ISimulationEvent extends Document {
  // Globally unique — this is the deduplication key
  // Format: {eventType}:{campaignId}:{userId}:{hashedToken}
  // For events with no token (voice responses): {eventType}:{campaignId}:{userId}:{callSid}
  idempotencyKey: string;

  eventType: EventType;
  campaignId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;

  // Links back to the mutable SimulationResult document (materialized view)
  simulationResultId?: Schema.Types.ObjectId;

  occurredAt: Date;   // when the user performed the action
  recordedAt: Date;   // when we stored it (for lag analysis)

  metadata: {
    ipAddress?: string;
    userAgent?: string;
    isBot: boolean;
    isBypassed: boolean;
    formFields?: string[];
    reportMethod?: string;
    messageSid?: string;
    callSid?: string;
    templateKey?: string;
    // State machine validation: what was the prior state when this event arrived?
    priorState?: {
      clicked: boolean;
      credentialsSubmitted: boolean;
      reportedPhishing: boolean;
    };
  };

  // Was this event rejected by the state machine?
  // Stored so we can audit attempts, not just successes.
  rejected: boolean;
  rejectionReason?: string;

  createdAt: Date;
}

const simulationEventSchema = new Schema<ISimulationEvent>(
  {
    idempotencyKey: {
      type:     String,
      required: true,
      // THE critical constraint — MongoDB enforces uniqueness here.
      // Even if Redis is down and the application layer misses a duplicate,
      // this unique index is the final backstop.
      unique:   true,
    },
    eventType:          { type: String, required: true },
    campaignId:         { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
    simulationResultId: { type: Schema.Types.ObjectId, ref: 'SimulationResult' },
    occurredAt:         { type: Date, required: true },
    recordedAt:         { type: Date, default: Date.now },
    metadata: {
      ipAddress:    String,
      userAgent:    String,
      isBot:        { type: Boolean, default: false },
      isBypassed:   { type: Boolean, default: false },
      formFields:   [String],
      reportMethod: String,
      messageSid:   String,
      callSid:      String,
      templateKey:  String,
      priorState: {
        clicked:              Boolean,
        credentialsSubmitted: Boolean,
        reportedPhishing:     Boolean,
      },
    },
    rejected:        { type: Boolean, default: false },
    rejectionReason: String,
  },
  {
    timestamps: true,
    // Immutable — events are never updated after creation
    // Enforced at application layer; schema cannot enforce this natively in Mongoose
  }
);

// Query patterns
simulationEventSchema.index({ campaignId: 1, userId: 1 });
simulationEventSchema.index({ campaignId: 1, eventType: 1 });
simulationEventSchema.index({ userId: 1, eventType: 1 });
simulationEventSchema.index({ occurredAt: 1 });
// For risk replay: get all events for a user in order
simulationEventSchema.index({ userId: 1, occurredAt: 1 });

export const SimulationEvent = model<ISimulationEvent>(
  'SimulationEvent',
  simulationEventSchema
);