import mongoose, { Schema, model, type Document } from "mongoose"

export interface IOrganization {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export interface IOrganizationDocument extends Document {
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
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

export const Organization = mongoose.models.Organization || model<IOrganizationDocument>("Organization", organizationSchema)


