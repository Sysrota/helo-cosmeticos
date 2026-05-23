import { useEffect } from "react";

import {
  getConversations,
  markAsRead,
} from "../services/attendance.service";

import {
  useAttendanceStore,
} from "../store/attendance.store";

import { socket }
  from "../../../websocket/socket";

export function ConversationsSidebar() {

  const {
    conversations,

    setConversations,

    selectedConversation,

    setSelectedConversation,

    updateConversation,

    setMobileView,
  } =
    useAttendanceStore();

  useEffect(() => {

    loadConversations();

  }, []);

  useEffect(() => {

    socket.on(
      "conversation_updated",
      (conversation) => {

        updateConversation(
          conversation
        );
      }
    );

    return () => {

      socket.off(
        "conversation_updated"
      );
    };
  }, []);

  async function loadConversations() {

    try {

      const data =
        await getConversations();

      setConversations(
        data
      );

    } catch (error) {

      console.error(
        error
      );
    }
  }

  return (
    <div className="
      flex
      flex-col
      h-full
      bg-transparent
      text-[#3d2b2b]
      rounded-3xl
      overflow-hidden
    ">

      {/* HEADER */}
      <div className="
        p-4
        md:p-5
        border-b
        border-[#f1e6e1]
        shrink-0
      ">

        <h2 className="
          text-xl
          md:text-2xl
          font-bold
          text-[#0b141a]
        ">
          Atendimento
        </h2>

        <p className="
          text-sm
          text-zinc-500
          mt-1
        ">
          Conversas em tempo real
        </p>
      </div>

      {/* LISTA */}
      <div className="
        flex-1
        overflow-y-auto
        p-2
        md:p-3
      ">

        {conversations.map(
          (conversation) => {

            const isSelected =
              selectedConversation?.id ===
              conversation.id;

            return (
              <button
                key={conversation.id}

                onClick={async () => {

                  setSelectedConversation(
                    conversation
                  );

                  setMobileView(
                    "chat"
                  );

                  await markAsRead(
                    conversation.id
                  );
                }}

                className={`
                  w-full

                  flex
                  items-start

                  gap-3

                  p-3
                  md:p-4

                  rounded-2xl

                  mb-2

                  transition-all
                  duration-200

                  border

                  text-left

                  ${
                    isSelected
                      ? `
                        bg-[#f5e7df]
                        border-[#eadfd8]
                      `
                      : `
                        border-transparent
                        hover:bg-[#f8efea]
                      `
                  }
                `}
              >

                {/* AVATAR */}
                <div
                  className="
                    w-11
                    h-11

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

                    text-base
                    md:text-lg

                    shrink-0
                  "
                >
                  {conversation.contact?.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "C"}
                </div>

                {/* CONTEÚDO */}
                <div className="
                  flex-1
                  min-w-0
                ">

                  {/* TOPO */}
                  <div className="
                    flex
                    items-start
                    justify-between
                    gap-2
                  ">

                    <div className="
                      min-w-0
                      flex-1
                    ">

                      <div className="
                        font-semibold
                        truncate
                        text-sm
                        md:text-base
                      ">
                        {conversation.contact
                          ?.name ||

                          conversation.contact
                            ?.phone}
                      </div>

                      <div className="
                        text-xs
                        text-zinc-400
                        mt-0.5
                      ">
                        WhatsApp
                      </div>
                    </div>

                    <div className="
                      flex
                      flex-col
                      items-end
                      gap-1
                      shrink-0
                    ">

                      <div className="
                        text-[11px]
                        text-zinc-500
                      ">
                        agora
                      </div>

                      {conversation.unread_count >
                        0 && (

                        <div
                          className="
                            inline-flex
                            items-center
                            justify-center

                            min-w-[20px]
                            h-[20px]

                            px-1.5

                            rounded-full

                            bg-[#00a884]

                            text-white
                            text-[10px]
                            font-bold
                          "
                        >
                          {
                            conversation.unread_count
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MENSAGEM */}
                  <div className="
                    text-sm
                    text-zinc-500

                    truncate

                    mt-2
                  ">
                    {conversation.last_message ||
                      "Sem mensagens"}
                  </div>
                </div>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}