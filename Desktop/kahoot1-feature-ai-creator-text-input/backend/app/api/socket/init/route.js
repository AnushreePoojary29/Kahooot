import { NextResponse } from "next/server"
import { initSocketServer } from "@/lib/socket-server"

export async function GET() {
  try {
    const result = initSocketServer()
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Socket init error:", error)
    return NextResponse.json({ error: "Failed to initialize socket server" }, { status: 500 })
  }
}
