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

export async function openConversation(
  data: {
    phone: string;
    name?: string;
  }
) {
  const response =
    await api.post(
      "/attendance",
      data
    );

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

export async function deleteConversation(
  conversationId: number
) {
  const token =
    localStorage.getItem(
      "auth_token"
    );

  await api.delete(
    `/attendance/${conversationId}`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
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

export async function uploadFile(
  formData: FormData
) {

  const token =
    localStorage.getItem(
      "auth_token"
    );

  const response =
    await api.post(
      "/attendance/upload",
      formData,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "multipart/form-data",
        },
      }
    );

  return response.data;
}
