import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getMessages,
  sendMessage,
  uploadFile,
} from "../services/attendance.service";

import {
  useAttendanceStore,
} from "../store/attendance.store";

import { socket } from "../websocket/socket";

import EmojiPicker from "emoji-picker-react";

export function ChatMessages() {

  const {
    selectedConversation,
    messages,
    setMessages,
    addMessage,
  } = useAttendanceStore();

  const [message, setMessage] =
    useState("");

  const [
    showEmojiPicker,
    setShowEmojiPicker,
  ] = useState(false);

  const [isTyping, setIsTyping] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  // Entrar na conversa
  useEffect(() => {

    if (!selectedConversation)
      return;

    socket.emit(
      "join_conversation",
      selectedConversation.id
    );

    loadMessages();

  }, [selectedConversation]);

  // Receber mensagens realtime
  useEffect(() => {

    function handleNewMessage(
      newMessage: any
    ) {

      if (
        newMessage.conversation_id ===
        selectedConversation?.id
      ) {

        addMessage(newMessage);
      }
    }

    socket.on(
      "new_message",
      handleNewMessage
    );

    return () => {

      socket.off(
        "new_message",
        handleNewMessage
      );
    };

  }, [selectedConversation]);

  // Typing realtime
  useEffect(() => {

    function handleTyping() {

      setIsTyping(true);

      setTimeout(() => {

        setIsTyping(false);

      }, 1500);
    }

    socket.on(
      "typing",
      handleTyping
    );

    return () => {

      socket.off(
        "typing",
        handleTyping
      );
    };

  }, []);

  // Scroll automático
  useEffect(() => {

    messagesEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });

  }, [messages]);

  async function loadMessages() {

    if (!selectedConversation)
      return;

    const data =
      await getMessages(
        selectedConversation.id
      );

    setMessages(data);
  }

  async function handleSendMessage() {

    if (!message.trim())
      return;

    if (!selectedConversation)
      return;

    const currentMessage =
      message;

    setMessage("");

    await sendMessage({
      conversation_id:
        selectedConversation.id,

      sender_type: "agent",

      content: currentMessage,
    });
  }

  function handleEmojiClick(
    emojiData: any
  ) {

    setMessage(
      (prev) =>
        prev + emojiData.emoji
    );

    setShowEmojiPicker(false);
  }

  async function handleFileUpload(
    file: File
  ) {

    if (!selectedConversation)
      return;

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "conversation_id",
      String(
        selectedConversation.id
      )
    );

    await uploadFile(
      formData
    );
  }

  if (!selectedConversation) {

    return (
      <div
        className="
          h-full
          flex
          items-center
          justify-center
          text-[#8b6b61]
          bg-[#f6f1ee]
        "
      >
        Selecione uma conversa
      </div>
    );
  }

  return (
    <div
      className="
        flex
        flex-col
        h-full
        bg-[#f6f1ee]
      "
    >

      {/* Header */}
      <div
        className="
          px-6
          py-5
          border-b
          border-[#eadfd8]
          bg-[#f3e5df]
        "
      >
        <div className="flex items-center gap-4">

          <div
            className="
              w-12
              h-12
              rounded-full
              bg-gradient-to-br
              from-[#f3d6cb]
              to-[#ddb7aa]
              flex
              items-center
              justify-center
              font-bold
              text-lg
              text-[#5c4033]
            "
          >
            {selectedConversation
              .contact?.name
              ?.charAt(0)
              ?.toUpperCase() || "C"}
          </div>

          <div>

            <h2
              className="
                font-semibold
                text-lg
                text-[#3d2b2b]
              "
            >
              {selectedConversation
                .contact?.name ||
                selectedConversation
                  ?.contact?.phone}
            </h2>

            <p
              className="
                text-sm
                text-[#9b7b72]
              "
            >
              {isTyping
                ? "digitando..."
                : "ativo recentemente"}
            </p>

          </div>

        </div>
      </div>

      {/* Mensagens */}
      <div
        className="
          flex-1
          overflow-y-auto
          p-6
          space-y-4
        "
      >

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
                py-4
                rounded-3xl
                shadow-sm
                text-sm
                leading-relaxed

                ${
                  message.sender_type ===
                  "agent"
                    ? `
                      bg-[#d6a692]
                      text-white
                    `
                    : `
                      bg-white
                      text-[#3d2b2b]
                      border
                      border-[#eadfd8]
                    `
                }
              `}
            >

              <div className="space-y-3">

                {/* Imagem */}
                {message.type ===
                  "image" &&
                  message.media_url && (
                    <img
                      src={`${window.location.origin}${message.media_url}`}
                      alt=""
                      className="
                        rounded-2xl
                        max-w-full
                        max-h-[320px]
                        object-cover
                      "
                    />
                )}

                {/* Áudio */}
                {message.type ===
                  "audio" &&
                  message.media_url && (
                    <audio
                      controls
                      preload="metadata"
                      className="w-full"
                      src={`${window.location.origin}${message.media_url}`}
                    />
                )}

                {/* Documento */}
                {message.type ===
                  "document" &&
                  message.media_url && (
                    <a
                      href={`${window.location.origin}${message.media_url}`}
                      target="_blank"
                      className="
                        inline-flex
                        items-center
                        gap-2
                        bg-black/5
                        px-4
                        py-3
                        rounded-2xl
                      "
                    >
                      📄 Abrir documento
                    </a>
                )}

                {/* Texto */}
                <div>
                  {message.content}
                </div>

              </div>

              {/* Hora */}
              <div
                className="
                  text-[10px]
                  opacity-60
                  mt-2
                  text-right
                "
              >
                {new Date(
                  message.created_at
                ).toLocaleTimeString(
                  "pt-BR",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </div>

            </div>

          </div>
        ))}

        <div ref={messagesEndRef} />

      </div>

      {/* Footer */}
      <div
        className="
          p-5
          border-t
          border-[#eadfd8]
          bg-[#f3e5df]
        "
      >

        <div className="flex gap-3 relative">

          {/* Upload */}
          <div className="relative">

            <input
              ref={fileInputRef}
              type="file"
              hidden

              onChange={(e) => {

                const file =
                  e.target.files?.[0];

                if (file) {

                  handleFileUpload(file);
                }
              }}
            />

            <button
              onClick={() =>
                fileInputRef.current?.click()
              }

              className="
                w-14
                h-14
                rounded-2xl
                bg-white
                border
                border-[#eadfd8]
                text-2xl
                shadow-sm
                hover:bg-[#f8f1ed]
                transition-all
              "
            >
              📎
            </button>

            {/* Emoji */}
            <button
              onClick={() =>
                setShowEmojiPicker(
                  !showEmojiPicker
                )
              }

              className="
                w-14
                h-14
                rounded-2xl
                bg-white
                border
                border-[#eadfd8]
                text-2xl
                shadow-sm
                hover:bg-[#f8f1ed]
                transition-all
                ml-3
              "
            >
              😊
            </button>

            {showEmojiPicker && (
              <div
                className="
                  absolute
                  bottom-16
                  left-0
                  z-50
                "
              >
                <EmojiPicker
                  onEmojiClick={
                    handleEmojiClick
                  }
                />
              </div>
            )}

          </div>

          {/* Input */}
          <input
            value={message}

            onChange={(e) => {

              setMessage(
                e.target.value
              );

              if (
                selectedConversation
              ) {

                socket.emit(
                  "typing",
                  selectedConversation.id
                );
              }
            }}

            placeholder="Digite uma mensagem"

            className="
              flex-1
              bg-white
              border
              border-[#eadfd8]
              text-[#3d2b2b]
              rounded-2xl
              px-5
              py-4
              outline-none
              shadow-sm
              focus:ring-2
              focus:ring-[#d6a692]
            "

            onKeyDown={(e) => {

              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {

                e.preventDefault();

                handleSendMessage();
              }
            }}
          />

          {/* Botão enviar */}
          <button
            onClick={handleSendMessage}

            className="
              bg-[#d6a692]
              hover:bg-[#c7917b]
              text-white
              px-8
              rounded-2xl
              font-semibold
              transition-all
              shadow-sm
            "
          >
            Enviar
          </button>

        </div>
      </div>
    </div>
  );
}