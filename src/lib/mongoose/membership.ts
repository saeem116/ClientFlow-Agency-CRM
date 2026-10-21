import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IMembership {
  id: string
  role: "ADMIN" | "MEMBER" | "CLIENT"
  createdAt: Date
  organizationId: string
  userId: string
}

export interface IMembershipDocument extends Document {
  role: "ADMIN" | "MEMBER" | "CLIENT"
  createdAt: Date
  organizationId: Types.ObjectId
  userId: Types.ObjectId
}

const membershipSchema = new Schema<IMembershipDocument>(
  {
    role: {
      type: String,
      enum: ["ADMIN", "MEMBER", "CLIENT"],
      default: "MEMBER",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true })

export const Membership = mongoose.models.Membership || model<IMembershipDocument>("Membership", membershipSchema)


