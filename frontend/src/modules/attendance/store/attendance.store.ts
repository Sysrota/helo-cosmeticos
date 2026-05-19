import { create } from "zustand";

import { Conversation } from "../types/conversation";

import { Message } from "../types/message";

interface AttendanceStore {
  conversations: Conversation[];

  messages: Message[];

  selectedConversation:
    Conversation | null;

  setConversations: (
    conversations: Conversation[]
  ) => void;

  setMessages: (
    messages: Message[]
  ) => void;

  addMessage: (
    message: Message
  ) => void;

  updateConversation: (
    conversation: Conversation
  ) => void;

  setSelectedConversation: (
    conversation: Conversation | null
  ) => void;
}

export const useAttendanceStore =
  create<AttendanceStore>((set) => ({
    conversations: [],

    messages: [],

    selectedConversation: null,

    setConversations: (
      conversations
    ) =>
      set({
        conversations,
      }),

    setMessages: (messages) =>
      set({
        messages,
      }),

    addMessage: (message) =>
      set((state) => ({
        messages: [
          ...state.messages,
          message,
        ],
      })),

    updateConversation: (
      conversation
    ) =>
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
        };
      }),

    setSelectedConversation: (
      conversation
    ) =>
      set({
        selectedConversation:
          conversation,
      }),
  }));