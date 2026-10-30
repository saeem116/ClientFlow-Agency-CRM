import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IPayment {
  id: string
  amount: number
  date: Date
  method: "BANK_TRANSFER" | "CREDIT_CARD" | "PAYPAL" | "CASH" | "CHECK" | "OTHER" | null
  reference: string | null
  notes: string | null
  createdAt: Date
  invoiceId: string
  organizationId: string
}

export interface IPaymentDocument extends Document {
  amount: number
  date: Date
  method: "BANK_TRANSFER" | "CREDIT_CARD" | "PAYPAL" | "CASH" | "CHECK" | "OTHER" | null
  reference: string | null
  notes: string | null
  createdAt: Date
  invoiceId: Types.ObjectId
  organizationId: Types.ObjectId
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    method: {
      type: String,
      enum: ["BANK_TRANSFER", "CREDIT_CARD", "PAYPAL", "CASH", "CHECK", "OTHER"],
      default: null,
    },
    reference: {
      type: String,
      default: null,
      trim: true,
    },
    notes: {
      type: String,
      default: null,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
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

export const Payment = mongoose.models.Payment || model<IPaymentDocument>("Payment", paymentSchema)


