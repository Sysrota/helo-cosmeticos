import { io }
  from "socket.io-client";

const apiUrl =
  import.meta.env.VITE_API_URL ||
  "/api";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (
    apiUrl.startsWith("http")
      ? new URL(apiUrl).origin
      : window.location.origin
  );

const apiPrefix =
  apiUrl.startsWith("/")
    ? apiUrl.replace(/\/$/, "")
    : "";

const socketPath =
  import.meta.env.VITE_SOCKET_PATH ||
  (
    apiPrefix
      ? `${apiPrefix}/socket.io`
      : "/socket.io"
  );

export const socket =
  io(
    socketUrl,
    {
      path:
        socketPath,

      transports: [
        "websocket",
        "polling",
      ],
    }
  );
