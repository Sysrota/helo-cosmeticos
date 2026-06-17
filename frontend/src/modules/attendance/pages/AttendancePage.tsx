import { useEffect } from "react";

import { useSearchParams }
  from "react-router-dom";

import { ConversationsSidebar }
  from "../components/ConversationsSidebar";

import { ChatMessages }
  from "../components/ChatMessages";

import { CustomerPanel }
  from "../components/CustomerPanel";

import {
  useAttendanceStore,
} from "../store/attendance.store";

import { socket }
  from "../../../websocket/socket";

import {
  markAsRead,
  openConversation,
} from "../services/attendance.service";

export function AttendancePage() {

  const {
    selectedConversation,
    mobileView,
    removeConversation,
    setSelectedConversation,
    setMobileView,
    updateConversation,
  } =
    useAttendanceStore();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  useEffect(() => {
    const phone =
      searchParams.get("phone")
        ?.replace(/\D/g, "");

    if (!phone) {
      return;
    }

    const normalizedPhone =
      phone;

    let cancelled = false;

    async function prepareConversation() {
      try {
        const conversation =
          await openConversation({
            phone:
              normalizedPhone,

            name:
              searchParams.get("name") ||
              undefined,
          });

        if (cancelled) {
          return;
        }

        updateConversation(
          conversation
        );

        setSelectedConversation(
          conversation
        );

        setMobileView(
          "chat"
        );

        await markAsRead(
          conversation.id
        );

        setSearchParams(
          {},
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Erro ao preparar atendimento:",
          error
        );
      }
    }

    prepareConversation();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    setMobileView,
    setSearchParams,
    setSelectedConversation,
    updateConversation,
  ]);

  useEffect(() => {
    function handleConversationDeleted(
      conversation: {
        id: number;
      }
    ) {
      removeConversation(
        conversation.id
      );
    }

    socket.on(
      "conversation_deleted",
      handleConversationDeleted
    );

    return () => {
      socket.off(
        "conversation_deleted",
        handleConversationDeleted
      );
    };
  }, [removeConversation]);

  return (
    <div
      className="
        h-[calc(100vh-120px)]
        bg-[#f8f4f1]
        p-2
        md:p-4
      "
    >

      {/* MOBILE */}
      <div className="
        lg:hidden
        h-full
      ">

        {/* CONVERSAS */}
        {mobileView ===
          "conversations" && (

          <div className="
            h-full
            rounded-3xl
            overflow-hidden
            bg-white
            border
          ">
            <ConversationsSidebar />
          </div>
        )}

        {/* CHAT */}
        {mobileView ===
          "chat" && (

          <div className="
            h-full
            rounded-3xl
            overflow-hidden
            bg-white
            border
          ">
            <ChatMessages />
          </div>
        )}

        {/* CLIENTE */}
        {mobileView ===
          "customer" && (

          <div className="
            h-full
            rounded-3xl
            overflow-hidden
            bg-white
            border
          ">
            <CustomerPanel />
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div
        className="
          hidden
          lg:flex
          gap-4
          h-full
        "
      >

        {/* SIDEBAR */}
        <div
          className="
            w-[340px]
            min-w-[340px]
            overflow-hidden
            rounded-3xl
            bg-white/80
            backdrop-blur-xl
            border
            border-[#eadfd8]
            shadow-sm
          "
        >
          <ConversationsSidebar />
        </div>

        {/* CHAT */}
        <div
          className="
            flex-1
            overflow-hidden
            rounded-3xl
            bg-white/80
            backdrop-blur-xl
            border
            border-[#eadfd8]
            shadow-sm
          "
        >
          <ChatMessages />
        </div>

        {/* CLIENTE */}
        {selectedConversation && (

          <div
            className="
              w-[340px]
              min-w-[340px]
              overflow-hidden
              rounded-3xl
              bg-white/80
              backdrop-blur-xl
              border
              border-[#eadfd8]
              shadow-sm
            "
          >
            <CustomerPanel />
          </div>
        )}
      </div>
    </div>
  );
}
