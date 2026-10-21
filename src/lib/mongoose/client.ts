import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IClient {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  country: string | null
  notes: string | null
  status: "active" | "inactive" | "prospect"
  createdAt: Date
  updatedAt: Date
  organizationId: string
  createdById: string | null
}

export interface IClientDocument extends Document {
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  country: string | null
  notes: string | null
  status: "active" | "inactive" | "prospect"
  createdAt: Date
  updatedAt: Date
  organizationId: Types.ObjectId
  createdById: Types.ObjectId | null
}

const clientSchema = new Schema<IClientDocument>(
  {
    firstName: {
      type: String,
      default: null,
      trim: true,
    },
    lastName: {
      type: String,
      default: null,
      trim: true,
    },
    companyName: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    website: {
      type: String,
      default: null,
      trim: true,
    },
    address: {
      type: String,
      default: null,
      trim: true,
    },
    city: {
      type: String,
      default: null,
      trim: true,
    },
    country: {
      type: String,
      default: null,
      trim: true,
    },
    notes: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "prospect"],
      default: "active",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
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

export const Client = mongoose.models.Client || model<IClientDocument>("Client", clientSchema)


