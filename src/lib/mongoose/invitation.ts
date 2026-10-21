import mongoose, { Schema, model, type Document, type Types } from "mongoose"

export interface IInvitation {
  id: string
  email: string
  role: "ADMIN" | "MEMBER" | "CLIENT"
  organizationId: string
  invitedById: string
  tokenHash: string
  tokenPrefix: string
  expiresAt: Date
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  createdAt: Date
}

export interface IInvitationDocument extends Document {
  email: string
  role: "ADMIN" | "MEMBER" | "CLIENT"
  organizationId: Types.ObjectId
  invitedById: Types.ObjectId
  tokenHash: string
  tokenPrefix: string
  expiresAt: Date
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  createdAt: Date
}

const invitationSchema = new Schema<IInvitationDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "MEMBER", "CLIENT"],
      required: true,
      default: "MEMBER",
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    invitedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    tokenPrefix: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"],
      default: "PENDING",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const _d = ret as Record<string, unknown>;
        if (_d.__v !== undefined) delete _d.__v;
        if (_d.tokenHash !== undefined) delete _d.tokenHash;
        if (_d.tokenPrefix !== undefined) delete _d.tokenPrefix;
        return ret;
      },
    },
  }
)

export const Invitation =
  mongoose.models.Invitation ||
  model<IInvitationDocument>("Invitation", invitationSchema)

/**
 * Generate a cryptographically secure token and return both the plain token
 * (to embed in the invitation link) and its hash (to store in MongoDB).
 *
 * The tokenPrefix (first 8 chars of the token) is stored alongside the hash
 * so the acceptance flow can narrow the lookup to a single pending invitation
 * before doing the expensive hash comparison.
 */
/**
 * Generate a cryptographically secure token and return both the plain token
 * (to embed in the invitation link) and its hash (to store in MongoDB).
 * Uses Web Crypto API for Edge Runtime compatibility.
 */
export async function generateTokenPair(): Promise<{
  token: string
  tokenHash: string
  tokenPrefix: string
}> {
  const randomBuffer = new Uint8Array(32)
  crypto.getRandomValues(randomBuffer)
  const token = Array.from(randomBuffer, (b) => b.toString(16).padStart(2, "0")).join("")
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token))
  const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("")
  const tokenPrefix = token.substring(0, 8)
  return { token, tokenHash, tokenPrefix }
}

/**
 * Verify a plain token against a stored hash.
 * Uses Web Crypto SHA-256 for Edge Runtime compatibility.
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token))
  const inputHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("")
  // Constant-time comparison via XOR
  if (inputHash.length !== hash.length) return false
  let result = 0
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ hash.charCodeAt(i)
  }
  return result === 0
}

