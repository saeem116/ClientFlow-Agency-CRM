import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IActivity {
  id: string
  type: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  organizationId: string | null
  clientId: string | null
  leadId: string | null
  projectId: string | null
  createdById: string | null
}

export interface IActivityDocument extends Document {
  type: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  organizationId: Types.ObjectId | null
  clientId: Types.ObjectId | null
  leadId: Types.ObjectId | null
  projectId: Types.ObjectId | null
  createdById: Types.ObjectId | null
}

const activitySchema = new Schema<IActivityDocument>(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
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

export const Activity = mongoose.models.Activity || model<IActivityDocument>("Activity", activitySchema)

