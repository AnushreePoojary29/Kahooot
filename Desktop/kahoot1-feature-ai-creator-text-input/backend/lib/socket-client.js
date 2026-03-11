import { io } from "socket.io-client"

let socketInstance = null

export function getGameSocket() {
  if (socketInstance) {
    return socketInstance
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001"
  socketInstance = io(socketUrl, {
    transports: ["websocket", "polling"],
  })

  return socketInstance
}
