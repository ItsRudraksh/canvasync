import { io } from "socket.io-client";

const SOCKET_URL = "https://canvasync-socket.up.railway.app";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
}); 