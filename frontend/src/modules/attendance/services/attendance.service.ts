import { api } from "../../../services/api";

export async function getConversations() {
  const token =
    localStorage.getItem("auth_token");

  const response =
    await api.get("/attendance", {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    });

  return response.data;
}

export async function getMessages(
  conversationId: number
) {
  const token =
    localStorage.getItem(
      "auth_token"
    );

  const response =
    await api.get(
      `/attendance/${conversationId}/messages`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return response.data;
}

export async function sendMessage(
  data: {
    conversation_id: number;
    sender_type: string;
    content: string;
  }
) {
  const token =
    localStorage.getItem(
      "auth_token"
    );

  const response =
    await api.post(
      "/attendance/messages",
      data,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return response.data;
}

export async function markAsRead(
  conversationId: number
) {
  const token =
    localStorage.getItem(
      "auth_token"
    );

  const response =
    await api.patch(
      `/attendance/${conversationId}/read`,
      {},
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return response.data;
}