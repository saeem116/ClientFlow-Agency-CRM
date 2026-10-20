import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IMilestone {
  id: string
  title: string
  description: string | null
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  projectId: string
}

export interface IMilestoneDocument extends Document {
  title: string
  description: string | null
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  projectId: Types.ObjectId
}

const milestoneSchema = new Schema<IMilestoneDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
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

export const Milestone = mongoose.models.Milestone || model<IMilestoneDocument>("Milestone", milestoneSchema)

