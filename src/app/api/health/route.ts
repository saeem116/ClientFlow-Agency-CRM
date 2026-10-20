import { NextResponse } from "next/server"
import mongoose from "mongoose"

/**
 * GET /api/health
 *
 * Lightweight health check that does NOT require MongoDB.
 * Returns 200 if the server is reachable. Use this to distinguish
 * "server is down" from "MongoDB is unreachable".
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: {
      readyState: mongoose.connection.readyState,
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    },
  })
}