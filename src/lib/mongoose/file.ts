import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IFile {
  id: string
  fileId: string
  originalFilename: string
  contentType: string
  size: number
  uploaderId: string
  organizationId: string
  categoryId: string | null
  clientId: string | null
  projectId: string | null
  createdAt: Date
}

export interface IFileDocument extends Document {
  fileId: string
  originalFilename: string
  contentType: string
  size: number
  uploaderId: Types.ObjectId
  organizationId: Types.ObjectId
  categoryId: Types.ObjectId | null
  clientId: Types.ObjectId | null
  projectId: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const fileSchema = new Schema<IFileDocument>(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploaderId: {
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
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const d = ret as Record<string, unknown>
        if (d.__v !== undefined) delete d.__v
        return d
      },
    },
  }
)

export const File = mongoose.models.File || model<IFileDocument>("File", fileSchema)

