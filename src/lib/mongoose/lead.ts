import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface ILead {
  id: string
  title: string
  description: string | null
  email: string | null
  phone: string | null
  stage: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST"
  source: "WEBSITE" | "REFERRAL" | "SOCIAL_MEDIA" | "EMAIL" | "PHONE" | "OTHER" | null
  value: number | null
  notes: string | null
  followUpAt: Date | null
  createdAt: Date
  updatedAt: Date
  organizationId: string
  clientId: string | null
  createdById: string | null
}

export interface ILeadDocument extends Document {
  title: string
  description: string | null
  email: string | null
  phone: string | null
  stage: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST"
  source: "WEBSITE" | "REFERRAL" | "SOCIAL_MEDIA" | "EMAIL" | "PHONE" | "OTHER" | null
  value: number | null
  notes: string | null
  followUpAt: Date | null
  createdAt: Date
  updatedAt: Date
  organizationId: Types.ObjectId
  clientId: Types.ObjectId | null
  createdById: Types.ObjectId | null
}

const leadSchema = new Schema<ILeadDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    stage: {
      type: String,
      enum: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"],
      default: "NEW",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "EMAIL", "PHONE", "OTHER"],
      default: null,
    },
    value: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    followUpAt: {
      type: Date,
      default: null,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const _d = ret as Record<string, unknown>; if (_d.__v !== undefined) delete _d.__v
        return ret
      },
    },
  }
)

export const Lead = mongoose.models.Lead || model<ILeadDocument>("Lead", leadSchema)


