import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getMessages,
  sendMessage,
} from "../services/attendance.service";

import {
  useAttendanceStore,
} from "../store/attendance.store";

import { socket } from "../websocket/socket";

export function ChatMessages() {
  const {
    selectedConversation,
    messages,
    setMessages,
    addMessage,
  } = useAttendanceStore();

  const [message, setMessage] =
    useState("");
    const [isTyping, setIsTyping] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    if (!selectedConversation)
      return;

    loadMessages();

    socket.emit(
      "join_conversation",
      selectedConversation.id
    );
  }, [selectedConversation]);

  useEffect(() => {
    socket.on(
      "new_message",
      (message) => {
        addMessage(message);
      }
    );

    return () => {
      socket.off("new_message");
    };
  }, []);

  useEffect(() => {
  socket.on("typing", () => {
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
    }, 1500);
  });

  return () => {
    socket.off("typing");
  };
}, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  async function loadMessages() {
    const data =
      await getMessages(
        selectedConversation!.id
      );

    setMessages(data);
  }

  async function handleSendMessage() {
    if (!message.trim())
      return;

    if (!selectedConversation)
      return;

    await sendMessage({
      conversation_id:
        selectedConversation.id,

      sender_type: "agent",

      content: message,
    });

    setMessage("");
  }

  if (!selectedConversation) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400 bg-[#F4C2C2] rounded-3xl">
        Selecione uma conversa
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#00a884] rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 bg-[#202c33] text-white">
        <div className="flex items-center gap-4">
          <div
            className="
              w-12
              h-12
              rounded-full
              bg-gradient-to-br
              from-pink-500
              to-rose-600
              flex
              items-center
              justify-center
              font-bold
              text-lg
            "
          >
            {selectedConversation
              .contact?.name
              ?.charAt(0)
              ?.toUpperCase() || "C"}
          </div>

          <div>
            <h2 className="font-bold text-lg">
              {selectedConversation
                .contact?.name ||
                selectedConversation
                  .contact?.phone}
            </h2>

            <p className="text-sm text-zinc-400">
            {isTyping
                ? "digitando..."
                : "online agora"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`
              flex

              ${
                message.sender_type ===
                "agent"
                  ? "justify-end"
                  : "justify-start"
              }
            `}
          >
            <div
              className={`
                max-w-[70%]
                px-5
                py-3
                rounded-3xl
                shadow-lg

                ${
                  message.sender_type ===
                  "agent"
                    ? `
                      bg-[#005c4b]
                      text-white
                    `
                    : `
                      bg-[#202c33]
                      text-white
                    `
                }
              `}
            >
            <div className="space-y-3">
              {message.type ===
                "image" &&
                message.media_url && (
                  <img
                    src={
                      `window.location.origin${message.media_url}`
                    }
                    alt=""
                    className="
                      rounded-2xl
                      max-w-full
                      max-h-[300px]
                      object-cover
                    "
                  />
                )}

              {message.type ===
                "audio" &&
                message.media_url && (
                  <audio
                    controls
                    className="w-full"
                  >
                    <source
                      src={
                        `window.location.origin${message.media_url}`
                      }
                    />
                  </audio>
                )}

              {message.type ===
                "document" &&
                message.media_url && (
                  <a
                    href={
                      `window.location.origin${message.media_url}`
                    }
                    target="_blank"
                    className="
                      inline-flex
                      items-center
                      gap-2
                      bg-white/10
                      px-4
                      py-3
                      rounded-xl
                    "
                  >
                    📄 Abrir documento
                  </a>
                )}

              <div>
                {message.content}
              </div>
            </div>

              <div className="text-[10px] opacity-60 mt-2 text-right">
                agora
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 border-t border-white/10 bg-[#202c33]">
        <div className="flex gap-3">
          <input
            value={message}
            onChange={(e) => {
            setMessage(e.target.value);

            if (selectedConversation) {
                socket.emit(
                "typing",
                selectedConversation.id
                );
            }
            }}
            placeholder="Digite uma mensagem"
            className="
              flex-1
              bg-[#2a3942]
              text-white
              rounded-2xl
              px-5
              py-4
              outline-none
            "
          />

          <button
            onClick={handleSendMessage}
            className="
              bg-[#00a884]
              hover:bg-[#019874]
              text-white
              px-8
              rounded-2xl
              font-semibold
              transition-all
            "
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}