import { Server } from "socket.io";

let io: Server;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const onlineUsers =
    new Set<string>();

  io.on("connection", (socket) => {
    console.log(
      `🔌 Cliente conectado: ${socket.id}`
    );

    socket.on(
      "join_conversation",
      (conversationId: number) => {
        socket.join(
          `conversation:${conversationId}`
        );

        console.log(
          `📥 Socket entrou na conversa ${conversationId}`
        );
      }
    );

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id);

      io.emit(
        "online_users",
        Array.from(onlineUsers)
      );
      console.log(
        `❌ Cliente desconectado: ${socket.id}`
      );
    });

    socket.on(
      "typing",
      (conversationId: number) => {
        socket.to(
          `conversation:${conversationId}`
        ).emit(
          "typing",
          {
            conversationId,
          }
        );
      }
    );
  
    socket.on(
      "user_online",
      (userId: string) => {
        onlineUsers.add(userId);

        io.emit(
          "online_users",
          Array.from(onlineUsers)
        );
      }
    );

  });

  return io;
}

export { io };