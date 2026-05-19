export interface Message {
  id: number;

  conversation_id: number;

  sender_type: string;

  content: string;

  type: string;

  media_url: string | null;

  created_at: string;
}