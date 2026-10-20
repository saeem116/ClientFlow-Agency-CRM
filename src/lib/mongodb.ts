import mongoose from "mongoose"

const globalForMongoose = globalThis as unknown as {
  mongoose: Promise<typeof mongoose> | undefined
}

export function connectMongo(): Promise<typeof mongoose> | typeof mongoose {
  if (globalForMongoose.mongoose) return globalForMongoose.mongoose

  const uri = process.env.MONGODB_URI
  if (!uri) {
    // Return a stub during build time when no MongoDB is available
    const stub = {
      connection: { readyState: 1 },
      disconnect: async () => {},
    } as unknown as typeof mongoose
    if (process.env.NEXT_PHASE === 'phase-production-build') return stub
    throw new Error("MONGODB_URI is not defined in environment variables")
  }

  const conn = mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })

  if (process.env.NODE_ENV !== "production") globalForMongoose.mongoose = conn
  return conn
}

export default connectMongo