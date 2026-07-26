// backend/src/models/SimulationResult.ts


import { Schema, model, Document } from 'mongoose';

export interface ISimulationResult extends Document {
  userId:     Schema.Types.ObjectId;
  campaignId: Schema.Types.ObjectId;
  simulationType: 'phishing' | 'smishing' | 'vishing';
  trackingToken?: string;

  // Email / Phishing
  emailOpened?:    boolean;
  emailOpenedAt?:  Date;
  emailClicked?:   boolean;
  emailClickedAt?: Date;
  emailTemplate?:  string;
  emailSent?:      boolean;
  emailSentAt?:    Date;
  emailAddress?:   string;
  messageId?:      string;

  // SMS / Smishing
  smsSent?:            boolean;
  smsSentAt?:          Date;
  smsDelivered?:       boolean;
  smsDeliveredAt?:     Date;
  smsDeliveryStatus?:  string;
  smsDeliveryError?:   string;
  smsErrorCode?:       string;
  smsLinkClicked?:     boolean;
  smsClickedAt?:       Date;
  smsTemplate?:        string;
  messageSid?:         string;
  phoneNumber?:        string;

  // Voice / Vishing
  callInitiated?:    boolean;
  callInitiatedAt?:  Date;
  callAnswered?:     boolean;
  callAnsweredAt?:   Date;
  callCompleted?:    boolean;
  callCompletedAt?:  Date;
  callDuration?:     number;
  callStatus?:       string;
  callResponse?:     string;
  callResponseAt?:   Date;
  voiceEngaged?:     boolean;
  voiceVerified?:    boolean;
  voiceReported?:    boolean;
  voiceOtherResponse?: string;
  voiceScript?:      string;
  callSid?:          string;
  answeredBy?:       string;

  // Shared outcomes
  credentialsSubmitted?:   boolean;
  credentialsSubmittedAt?: Date;
  formFieldsSubmitted?:    string[];   // field NAMES only — never actual values
  reportedPhishing?:       boolean;
  reportedAt?:             Date;
  reportMethod?:           string;

  // Click metadata
  clickIpAddress?: string;
  clickUserAgent?: string;

  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const simulationResultSchema = new Schema<ISimulationResult>(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    campaignId: {
      type:     Schema.Types.ObjectId,
      ref:      'Campaign',
      required: true,
    },
    simulationType: {
      type:    String,
      enum:    ['phishing', 'smishing', 'vishing'],
      default: 'smishing',
    },
    trackingToken: {
      type: String,
    },

    // Email / Phishing
    emailOpened:    { type: Boolean, default: false },
    emailOpenedAt:  Date,
    emailClicked:   { type: Boolean, default: false },
    emailClickedAt: Date,
    emailTemplate:  String,
    emailSent:      { type: Boolean, default: false },
    emailSentAt:    Date,
    emailAddress:   String,
    messageId:      String,

    // SMS / Smishing
    smsSent:           { type: Boolean, default: false },
    smsSentAt:         Date,
    smsDelivered:      { type: Boolean, default: false },
    smsDeliveredAt:    Date,
    smsDeliveryStatus: String,
    smsDeliveryError:  String,
    smsErrorCode:      String,
    smsLinkClicked:    { type: Boolean, default: false },
    smsClickedAt:      Date,
    smsTemplate:       String,
    messageSid:        String,
    phoneNumber:       String,

    // Voice / Vishing
    callInitiated:     { type: Boolean, default: false },
    callInitiatedAt:   Date,
    callAnswered:      { type: Boolean, default: false },
    callAnsweredAt:    Date,
    callCompleted:     { type: Boolean, default: false },
    callCompletedAt:   Date,
    callDuration:      Number,
    callStatus:        String,
    callResponse:      String,
    callResponseAt:    Date,
    voiceEngaged:      { type: Boolean, default: false },
    voiceVerified:     { type: Boolean, default: false },
    voiceReported:     { type: Boolean, default: false },
    voiceOtherResponse:String,
    voiceScript:       String,
    callSid:           String,
    answeredBy:        String,

    // Shared outcomes
    credentialsSubmitted:   { type: Boolean, default: false },
    credentialsSubmittedAt: Date,
    formFieldsSubmitted:    [String],
    reportedPhishing:       { type: Boolean, default: false },
    reportedAt:             Date,
    reportMethod:           String,

    // Click metadata
    clickIpAddress: String,
    clickUserAgent: String,

    timestamp: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
//
// NOTE: The compound index on (campaignId, userId, trackingToken) is NOT unique.
// Uniqueness was causing upsert failures when the token changed from 'pending'
// to the real hash. Application-level $ne guards handle idempotency instead.
// ─────────────────────────────────────────────────────────────────────────────
simulationResultSchema.index({ userId:     1 });
simulationResultSchema.index({ campaignId: 1 });
// The { campaignId: 1, userId: 1 } index is redundant because { campaignId: 1, userId: 1, trackingToken: 1 } covers it.
simulationResultSchema.index({ simulationType: 1 });
simulationResultSchema.index({ userId: 1, createdAt: -1 });

// Lookup index for token-based queries (NOT unique — see note above)
simulationResultSchema.index({ campaignId: 1, userId: 1, trackingToken: 1 });

// Lookup indexes for Twilio webhook callbacks
simulationResultSchema.index({ messageSid: 1 }, { sparse: true });
simulationResultSchema.index({ callSid:    1 }, { sparse: true });

// Compound index for analytics aggregations by campaign type
simulationResultSchema.index({ campaignId: 1, simulationType: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// MODEL
// ─────────────────────────────────────────────────────────────────────────────
const SimulationResult = model<ISimulationResult>(
  'SimulationResult',
  simulationResultSchema
);

export default SimulationResult;