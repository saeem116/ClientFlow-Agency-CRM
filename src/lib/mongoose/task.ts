import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface ITask {
  id: string
  title: string
  description: string | null
  status: "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  projectId: string | null
  milestoneId: string | null
  assigneeId: string | null
  organizationId: string | null
}

export interface ITaskDocument extends Document {
  title: string
  description: string | null
  status: "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  dueDate: Date | null
  completedAt: Date | null
  projectId: Types.ObjectId | null
  milestoneId: Types.ObjectId | null
  assigneeId: Types.ObjectId | null
  organizationId: Types.ObjectId | null
}

const taskSchema = new Schema<ITaskDocument>(
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
    status: {
      type: String,
      enum: ["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "DONE"],
      default: "BACKLOG",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      required: true,
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
      default: null,
      index: true,
    },
    milestoneId: {
      type: Schema.Types.ObjectId,
      ref: "Milestone",
      default: null,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
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

export const Task = mongoose.models.Task || model<ITaskDocument>("Task", taskSchema)
