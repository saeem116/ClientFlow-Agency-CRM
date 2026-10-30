import mongoose, { Schema, model, type Document } from "mongoose"

export interface IUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  password: string | null
  role: "ADMIN" | "MEMBER" | "CLIENT"
  phone: string | null
  createdAt: Date
  updatedAt: Date
}

export interface IUserDocument extends Document {
  email: string
  name: string | null
  avatar: string | null
  password: string | null
  role: "ADMIN" | "MEMBER" | "CLIENT"
  phone: string | null
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      default: null,
      select: false,
    },
    role: {
      type: String,
      enum: ["ADMIN", "MEMBER", "CLIENT"],
      default: "MEMBER",
      required: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const document = ret as Record<string, unknown>
        if (document.password !== undefined) delete document.password
        if (document.__v !== undefined) delete document.__v
        return document
      },
    },
  }
)

export const User = mongoose.models.User || model<IUserDocument>("User", userSchema)