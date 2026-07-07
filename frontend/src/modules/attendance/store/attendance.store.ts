import { create } from "zustand";

import { Conversation }
  from "../types/conversation";

import { Message }
  from "../types/message";

interface AttendanceStore {

  conversations:
    Conversation[];

  messages:
    Message[];

  selectedConversation:
    Conversation | null;

  mobileView:
    | "conversations"
    | "chat"
    | "customer";

  setMobileView: (
    view:
      | "conversations"
      | "chat"
      | "customer"
  ) => void;

  setConversations: (
    conversations:
      Conversation[]
  ) => void;

  setMessages: (
    messages:
      Message[]
  ) => void;

  addMessage: (
    message:
      Message
  ) => void;

  updateConversation: (
    conversation:
      Conversation
  ) => void;

  removeConversation: (
    conversationId:
      number
  ) => void;

  setSelectedConversation: (
    conversation:
      Conversation | null
  ) => void;
}

export const useAttendanceStore =
  create<AttendanceStore>(
    (set) => ({

      conversations: [],

      messages: [],

      selectedConversation:
        null,

      mobileView:
        "conversations",

      setMobileView:
        (view) =>
          set({
            mobileView:
              view,
          }),

      setConversations:
        (conversations) =>
          set({
            conversations,
          }),

      setMessages:
        (messages) =>
          set({
            messages,
          }),

      addMessage:
        (message) =>
          set((state) => ({
            messages: [
              ...state.messages,
              message,
            ],
          })),

      updateConversation:
        (conversation) =>
          set((state) => {

            const exists =
              state.conversations.find(
                (c) =>
                  c.id ===
                  conversation.id
              );

            if (!exists) {

              return {
                conversations: [
                  conversation,
                  ...state.conversations,
                ],
                selectedConversation:
                  state.selectedConversation
                    ?.id === conversation.id
                    ? conversation
                    : state.selectedConversation,
              };
            }

            return {
              conversations:
                state.conversations
                  .map((c) =>
                    c.id ===
                    conversation.id
                      ? conversation
                      : c
                  )
                  .sort((a, b) => {

                    return (
                      new Date(
                        b.last_message_at ||
                          ""
                      ).getTime() -

                      new Date(
                        a.last_message_at ||
                          ""
                      ).getTime()
                    );
                  }),
              selectedConversation:
                state.selectedConversation
                  ?.id === conversation.id
                  ? conversation
                  : state.selectedConversation,
            };
          }),

      removeConversation:
        (conversationId) =>
          set((state) => {
            const removedSelected =
              state.selectedConversation
                ?.id === conversationId;

            return {
              conversations:
                state.conversations.filter(
                  (conversation) =>
                    conversation.id !==
                    conversationId
                ),
              selectedConversation:
                removedSelected
                  ? null
                  : state.selectedConversation,
              messages:
                removedSelected
                  ? []
                  : state.messages,
              mobileView:
                removedSelected
                  ? "conversations"
                  : state.mobileView,
            };
          }),

      setSelectedConversation:
        (conversation) =>
          set({
            selectedConversation:
              conversation,
          }),
    })
  );
