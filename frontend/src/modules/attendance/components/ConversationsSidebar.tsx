import { useEffect } from "react";

import {
  getConversations,
  markAsRead,
} from "../services/attendance.service";

import {
  useAttendanceStore,
} from "../store/attendance.store";

import { socket } from "../websocket/socket";

export function ConversationsSidebar() {
  const {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    updateConversation,
  } = useAttendanceStore();

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

      setConversations(data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-[#3d2b2b] rounded-3xl overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <h2 className="text-2xl font-bold text-[#0b141a]">
          Atendimento
        </h2>

        <p className="text-sm text-zinc-500 mt-1">
          Conversas em tempo real
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
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

                  await markAsRead(
                    conversation.id
                  );
                }}
                className={`
                  w-full
                  flex
                  items-start
                  gap-3
                  p-4
                  rounded-2xl
                  mb-2
                  transition-all
                  border

                  ${
                    isSelected
                      ? `
                        bg-[#f5e7df]
                        border-[#F2F2E1]
                      `
                      : `
                        border-transparent
                        hover:bg-[#f8efea]
                      `
                  }
                `}
              >
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
                    shrink-0
                  "
                >
                  {conversation.contact?.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "C"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">

                    {conversation.unread_count >
                      0 && (
                      <div
                        className="
                          mt-2
                          inline-flex
                          items-center
                          justify-center
                          min-w-[22px]
                          h-[22px]
                          px-2
                          rounded-full
                          bg-[#00a884]
                          text-white
                          text-xs
                          font-bold
                        "
                      >
                        {
                          conversation.unread_count
                        }
                      </div>
                    )}

                    <div className="font-semibold truncate">
                      {conversation.contact
                        ?.name ||
                        conversation.contact
                          ?.phone}
                    </div>

                    <div className="text-xs text-zinc-500">
                      agora
                    </div>
                  </div>

                  <div className="text-sm text-zinc-400 truncate mt-1">
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