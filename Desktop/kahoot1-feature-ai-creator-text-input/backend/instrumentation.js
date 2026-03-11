let bootstrapped = false

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  // Keep Node-only modules out of Edge instrumentation bundles.
  const [{ connectToDatabase }, { initSocketServer }] = await Promise.all([
    import("@/lib/mongodb"),
    import("@/lib/socket-server"),
  ])

  if (bootstrapped) {
    return
  }
  bootstrapped = true

  const apiPort = process.env.PORT || "4000"
  console.log(`[backend] API server running on port ${apiPort}`)

  try {
    await connectToDatabase()
    console.log("[backend] MongoDB connected")
  } catch (error) {
    console.error("[backend] MongoDB connection failed:", error instanceof Error ? error.message : String(error))
  }

  try {
    const socketInfo = initSocketServer()
    console.log(`[backend] Socket server running on port ${socketInfo.port}`)
  } catch (error) {
    console.error("[backend] Socket server startup failed:", error instanceof Error ? error.message : String(error))
  }
}
