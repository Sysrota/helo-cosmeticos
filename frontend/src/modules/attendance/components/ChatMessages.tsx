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

import { socket }
  from "../../../websocket/socket";

import EmojiPicker
  from "emoji-picker-react";

const MESSAGE_SYNC_INTERVAL_MS =
  4000;

function getMessageVersion(
  messages: any[]
) {
  const lastMessage =
    messages[messages.length - 1];

  return [
    messages.length,
    lastMessage?.id || "",
    lastMessage?.content || "",
  ].join(":");
}

export function ChatMessages() {

  const {
    selectedConversation,

    messages,

    setMessages,

    addMessage,

    setMobileView,
  } =
    useAttendanceStore();

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

  const messagesVersionRef =
    useRef("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  // JOIN
  useEffect(() => {

    if (!selectedConversation)
      return;

    let isActive = true;
    messagesVersionRef.current = "";

    async function syncMessages() {

      try {

        const data =
          await getMessages(
            selectedConversation!.id
          );

        const version =
          getMessageVersion(data);

        if (
          isActive &&
          version !==
            messagesVersionRef.current
        ) {
          messagesVersionRef.current =
            version;

          setMessages(data);
        }

      } catch (error) {

        console.error(
          "Erro ao sincronizar mensagens:",
          error
        );
      }
    }

    function joinConversation() {
      socket.emit(
        "join_conversation",
        selectedConversation!.id
      );

      syncMessages();
    }

    joinConversation();

    const syncInterval =
      window.setInterval(
        syncMessages,
        MESSAGE_SYNC_INTERVAL_MS
      );

    socket.on(
      "connect",
      joinConversation
    );

    return () => {
      isActive = false;

      window.clearInterval(
        syncInterval
      );

      socket.off(
        "connect",
        joinConversation
      );
    };

  }, [selectedConversation]);

  useEffect(() => {
    messagesVersionRef.current =
      getMessageVersion(messages);
  }, [messages]);

  // REALTIME
  useEffect(() => {

    function handleNewMessage(
      newMessage: any
    ) {

      if (
        newMessage.conversation_id ===
        selectedConversation?.id
      ) {

        addMessage(
          newMessage
        );
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

  // TYPING
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

  // SCROLL
  useEffect(() => {

    messagesEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });

  }, [messages]);

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

      sender_type:
        "agent",

      content:
        currentMessage,
    });
  }

  function handleEmojiClick(
    emojiData: any
  ) {

    setMessage(
      (prev) =>
        prev + emojiData.emoji
    );

    setShowEmojiPicker(
      false
    );
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

      {/* HEADER */}
      <div
        className="
          px-3
          md:px-6

          py-3
          md:py-5

          border-b
          border-[#eadfd8]

          bg-[#f3e5df]

          shrink-0
        "
      >

        <div className="
          flex
          items-center
          justify-between
          gap-3
        ">

          {/* ESQUERDA */}
          <div className="
            flex
            items-center
            gap-3
            min-w-0
          ">

            {/* VOLTAR MOBILE */}
            <button
              onClick={() =>
                setMobileView(
                  "conversations"
                )
              }

              className="
                lg:hidden

                w-10
                h-10

                rounded-xl

                bg-white

                border

                shrink-0
              "
            >
              ←
            </button>

            {/* AVATAR */}
            <div
              className="
                w-10
                h-10

                md:w-12
                md:h-12

                rounded-full

                bg-gradient-to-br
                from-[#f3d6cb]
                to-[#ddb7aa]

                flex
                items-center
                justify-center

                font-bold

                text-[#5c4033]

                shrink-0
              "
            >
              {selectedConversation
                .contact?.name
                ?.charAt(0)
                ?.toUpperCase() ||
                "C"}
            </div>

            {/* INFO */}
            <div className="
              min-w-0
            ">

              <h2
                className="
                  font-semibold
                  text-sm
                  md:text-lg

                  text-[#3d2b2b]

                  truncate
                "
              >
                {selectedConversation
                  .contact?.name ||

                  selectedConversation
                    ?.contact?.phone}
              </h2>

              <p
                className="
                  text-xs
                  md:text-sm

                  text-[#9b7b72]
                "
              >
                {isTyping
                  ? "digitando..."
                  : "ativo recentemente"}
              </p>
            </div>
          </div>

          {/* CLIENTE */}
          <button
            onClick={() =>
              setMobileView(
                "customer"
              )
            }

            className="
              lg:hidden

              px-3
              py-2

              rounded-xl

              bg-white
              border

              text-sm

              shrink-0
            "
          >
            Cliente
          </button>
        </div>
      </div>

      {/* MENSAGENS */}
      <div
        className="
          flex-1
          overflow-y-auto

          p-3
          md:p-6

          space-y-3
          md:space-y-4
        "
      >

        {messages.map(
          (message) => (

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
                  max-w-[88%]
                  md:max-w-[70%]

                  px-4
                  md:px-5

                  py-3
                  md:py-4

                  rounded-3xl

                  shadow-sm

                  text-sm

                  leading-relaxed

                  break-words

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

                <div className="
                  space-y-3
                ">

                  {/* IMG */}
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

                  {/* AUDIO */}
                  {message.type ===
                    "audio" &&
                    message.media_url && (

                    <audio
                      controls
                      preload="metadata"

                      className="
                        w-full
                      "

                      src={`${window.location.origin}${message.media_url}`}
                    />
                  )}

                  {/* DOC */}
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
                      📄 Documento
                    </a>
                  )}

                  {/* TEXTO */}
                  <div>
                    {message.content}
                  </div>
                </div>

                {/* HORA */}
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
                      hour:
                        "2-digit",

                      minute:
                        "2-digit",
                    }
                  )}
                </div>
              </div>
            </div>
          )
        )}

        <div
          ref={messagesEndRef}
        />
      </div>

      {/* FOOTER */}
      <div
        className="
          p-3
          md:p-5

          border-t
          border-[#eadfd8]

          bg-[#f3e5df]

          shrink-0
        "
      >

        <div className="
          flex
          items-end
          gap-2
          md:gap-3

          relative
        ">

          {/* UPLOAD */}
          <input
            ref={fileInputRef}

            type="file"

            hidden

            onChange={(e) => {

              const file =
                e.target.files?.[0];

              if (file) {

                handleFileUpload(
                  file
                );
              }
            }}
          />

          <button
            onClick={() =>
              fileInputRef.current?.click()
            }

            className="
              w-11
              h-11

              md:w-14
              md:h-14

              rounded-2xl

              bg-white

              border
              border-[#eadfd8]

              text-xl

              shrink-0
            "
          >
            📎
          </button>

          {/* INPUT */}
          <div className="
            flex-1
            relative
          ">

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
                w-full

                bg-white

                border
                border-[#eadfd8]

                text-[#3d2b2b]

                rounded-2xl

                pl-4
                pr-12

                py-3
                md:py-4

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

            {/* EMOJI */}
            <button
              onClick={() =>
                setShowEmojiPicker(
                  !showEmojiPicker
                )
              }

              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2

                text-xl
              "
            >
              😊
            </button>

            {showEmojiPicker && (

              <div
                className="
                  absolute
                  bottom-14
                  right-0
                  z-50

                  scale-[0.85]
                  origin-bottom-right
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

          {/* ENVIAR */}
          <button
            onClick={
              handleSendMessage
            }

            className="
              bg-[#d6a692]
              hover:bg-[#c7917b]

              text-white

              px-4
              md:px-8

              h-11
              md:h-14

              rounded-2xl

              font-semibold

              transition-all

              shadow-sm

              shrink-0
            "
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
