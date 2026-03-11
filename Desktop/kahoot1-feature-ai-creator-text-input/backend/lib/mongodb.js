import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set")
}

let cachedConnection = null

export async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    cachedConnection = conn.connection
    console.log("✓ Connected to MongoDB")
    return cachedConnection
  } catch (error) {
    console.error("✗ MongoDB connection error:", error instanceof Error ? error.message : String(error))
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function disconnectFromDatabase() {
  if (cachedConnection) {
    await mongoose.disconnect()
    cachedConnection = null
  }
}
