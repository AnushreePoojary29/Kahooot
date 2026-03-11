import { createServer } from "node:http"
import { Server } from "socket.io"

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || "4001", 10)
const globalForSockets = globalThis

function ensureServerTimeTicker() {
  if (globalForSockets.__quizSocketTicker || !globalForSockets.__quizSocketIO) {
    return
  }

  globalForSockets.__quizSocketTicker = setInterval(() => {
    globalForSockets.__quizSocketIO.emit("server-time", { serverNowMs: Date.now() })
  }, 1000)
}

export function initSocketServer() {
  if (globalForSockets.__quizSocketIO) {
    return {
      started: true,
      port: SOCKET_PORT,
    }
  }

  const httpServer = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true, service: "quiz-socket" }))
  })

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  })

  io.on("connection", (socket) => {
    socket.on("join-game", ({ gameId }) => {
      if (!gameId) return
      socket.join(`game:${gameId}`)
      socket.emit("joined-game", { gameId, serverNowMs: Date.now() })
    })
  })

  httpServer.listen(SOCKET_PORT)
  globalForSockets.__quizSocketHttpServer = httpServer
  globalForSockets.__quizSocketIO = io
  ensureServerTimeTicker()

  return {
    started: true,
    port: SOCKET_PORT,
  }
}

export function emitQuestionStarted({ gameId, questionIndex, questionStartMs, questionDurationMs }) {
  if (!globalForSockets.__quizSocketIO || !gameId) return

  globalForSockets.__quizSocketIO.to(`game:${gameId}`).emit("question-started", {
    gameId,
    questionIndex,
    questionStartMs,
    questionDurationMs,
    serverNowMs: Date.now(),
  })
}

export function emitGameEnded({ gameId }) {
  if (!globalForSockets.__quizSocketIO || !gameId) return

  globalForSockets.__quizSocketIO.to(`game:${gameId}`).emit("game-ended", {
    gameId,
    serverNowMs: Date.now(),
  })
}
