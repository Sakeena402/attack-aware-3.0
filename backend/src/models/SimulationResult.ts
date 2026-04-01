import { Schema, model, Document } from 'mongoose';

export interface ISimulationResult extends Document {
  userId: Schema.Types.ObjectId;
  campaignId: Schema.Types.ObjectId;
  simulationType: 'phishing' | 'smishing' | 'vishing';
  trackingToken?: string;
  
  // Email/Phishing fields
  emailOpened?: boolean;
  emailOpenedAt?: Date;
  linkClicked?: boolean;
  linkClickedAt?: Date;
  
  // SMS/Smishing fields
  smsSent?: boolean;
  smsSentAt?: Date;
  smsDelivered?: boolean;
  smsDeliveredAt?: Date;
  smsDeliveryStatus?: string;
  smsDeliveryError?: string;
  smsErrorCode?: string;
  smsLinkClicked?: boolean;
  smsClickedAt?: Date;
  smsTemplate?: string;
  messageSid?: string;
  phoneNumber?: string;
  
  // Voice/Vishing fields
  callInitiated?: boolean;
  callInitiatedAt?: Date;
  callAnswered?: boolean;
  callAnsweredAt?: Date;
  callCompleted?: boolean;
  callCompletedAt?: Date;
  callDuration?: number;
  callStatus?: string;
  callResponse?: string;
  callResponseAt?: Date;
  voiceEngaged?: boolean;
  voiceVerified?: boolean;
  voiceReported?: boolean;
  voiceOtherResponse?: string;
  voiceScript?: string;
  callSid?: string;
  answeredBy?: string;
  
  // Common fields
  credentialsSubmitted?: boolean;
  credentialsSubmittedAt?: Date;
  formFieldsSubmitted?: string[];
  reportedPhishing?: boolean;
  reportedAt?: Date;
  reportMethod?: string;
  
  // Tracking metadata
  clickIpAddress?: string;
  clickUserAgent?: string;
  
  timestamp: Date;
}

const simulationResultSchema = new Schema<ISimulationResult>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    simulationType: {
      type: String,
      enum: ['phishing', 'smishing', 'vishing'],
      default: 'phishing',
    },
    trackingToken: {
      type: String,
      index: true,
    },
    
    // Email/Phishing fields
    emailOpened: { type: Boolean, default: false },
    emailOpenedAt: Date,
    linkClicked: { type: Boolean, default: false },
    linkClickedAt: Date,
    
    // SMS/Smishing fields
    smsSent: { type: Boolean, default: false },
    smsSentAt: Date,
    smsDelivered: { type: Boolean, default: false },
    smsDeliveredAt: Date,
    smsDeliveryStatus: String,
    smsDeliveryError: String,
    smsErrorCode: String,
    smsLinkClicked: { type: Boolean, default: false },
    smsClickedAt: Date,
    smsTemplate: String,
    messageSid: { type: String, index: true },
    phoneNumber: String,
    
    // Voice/Vishing fields
    callInitiated: { type: Boolean, default: false },
    callInitiatedAt: Date,
    callAnswered: { type: Boolean, default: false },
    callAnsweredAt: Date,
    callCompleted: { type: Boolean, default: false },
    callCompletedAt: Date,
    callDuration: Number,
    callStatus: String,
    callResponse: String,
    callResponseAt: Date,
    voiceEngaged: { type: Boolean, default: false },
    voiceVerified: { type: Boolean, default: false },
    voiceReported: { type: Boolean, default: false },
    voiceOtherResponse: String,
    voiceScript: String,
    callSid: { type: String, index: true },
    answeredBy: String,
    
    // Common fields
    credentialsSubmitted: { type: Boolean, default: false },
    credentialsSubmittedAt: Date,
    formFieldsSubmitted: [String],
    reportedPhishing: { type: Boolean, default: false },
    reportedAt: Date,
    reportMethod: String,
    
    // Tracking metadata
    clickIpAddress: String,
    clickUserAgent: String,
    
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

simulationResultSchema.index({ userId: 1 });
simulationResultSchema.index({ campaignId: 1 });
simulationResultSchema.index({ userId: 1, campaignId: 1 });
simulationResultSchema.index({ simulationType: 1 });

const SimulationResult = model<ISimulationResult>(
  'SimulationResult',
  simulationResultSchema
);

export default SimulationResult;
