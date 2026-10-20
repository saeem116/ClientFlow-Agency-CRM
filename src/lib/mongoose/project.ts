import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IProject {
  id: string
  name: string
  description: string | null
  status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  budget: number | null
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
  organizationId: string
  clientId: string
  createdById: string | null
}

export interface IProjectDocument extends Document {
  name: string
  description: string | null
  status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  budget: number | null
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
  organizationId: Types.ObjectId
  clientId: Types.ObjectId
  createdById: Types.ObjectId | null
}

const projectSchema = new Schema<IProjectDocument>(
  {
    name: {
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
      enum: ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      required: true,
    },
    budget: {
      type: Number,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
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

export const Project = mongoose.models.Project || model<IProjectDocument>("Project", projectSchema)

