import dotenv from "dotenv";

import http from "http";

import { app } from "./app.js";

import { initSocket } from "./websocket/socket.js";

dotenv.config();

const PORT = process.env.PORT || 3333;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(
    `🚀 API rodando na porta ${PORT}`
  );
});