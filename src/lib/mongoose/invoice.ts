import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IInvoice {
  id: string
  number: string
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOIDED"
  issueDate: Date
  dueDate: Date | null
  notes: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  paidAmount: number
  createdAt: Date
  updatedAt: Date
  organizationId: string
  clientId: string
}

export interface IInvoiceDocument extends Document {
  number: string
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOIDED"
  issueDate: Date
  dueDate: Date | null
  notes: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  paidAmount: number
  createdAt: Date
  updatedAt: Date
  organizationId: Types.ObjectId
  clientId: Types.ObjectId
}

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOIDED"],
      default: "DRAFT",
      required: true,
      index: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    subtotal: {
      type: Number,
      default: 0,
      required: true,
    },
    taxRate: {
      type: Number,
      default: 0,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
      required: true,
    },
    total: {
      type: Number,
      default: 0,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      required: true,
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

export const Invoice = mongoose.models.Invoice || model<IInvoiceDocument>("Invoice", invoiceSchema)

