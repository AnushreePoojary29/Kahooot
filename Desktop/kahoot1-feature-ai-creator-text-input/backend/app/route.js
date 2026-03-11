import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    service: "kahoot1-backend",
    status: "ok",
    message: "Backend API only. Use /api/* endpoints.",
  })
}
