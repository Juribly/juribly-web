// juribly-web/src/lib/socket.js
import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SERVER_URL || "http://127.0.0.1:3000";

const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export default socket;
