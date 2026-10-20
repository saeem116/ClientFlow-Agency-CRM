import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface INotification {
  id: string
  userId: string
  organizationId: string
  type: string
  title: string
  message: string | null
  readAt: Date | null
  link: string | null
  createdAt: Date
}

export interface INotificationDocument extends Document {
  userId: Types.ObjectId
  organizationId: Types.ObjectId
  type: string
  title: string
  message: string | null
  readAt: Date | null
  link: string | null
  createdAt: Date
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
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
    message: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    link: {
      type: String,
      default: null,
      trim: true,
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

export const Notification = mongoose.models.Notification || model<INotificationDocument>("Notification", notificationSchema)

