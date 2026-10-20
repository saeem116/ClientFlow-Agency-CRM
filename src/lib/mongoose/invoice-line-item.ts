import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IInvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
  invoiceId: string
}

export interface IInvoiceLineItemDocument extends Document {
  description: string
  quantity: number
  unitPrice: number
  amount: number
  invoiceId: Types.ObjectId
}

const invoiceLineItemSchema = new Schema<IInvoiceLineItemDocument>(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
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

export const InvoiceLineItem = mongoose.models.InvoiceLineItem || model<IInvoiceLineItemDocument>("InvoiceLineItem", invoiceLineItemSchema)

