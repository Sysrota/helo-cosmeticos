export interface Contact {
  id: number;

  name?: string;

  phone: string;

  blocked_ai?: boolean;
}

export interface Conversation {
  id: number;

  status: string;

  last_message?: string;

  last_message_at?: string;

  created_at?: string;

  updated_at?: string;

  contact: Contact;
  unread_count: number;
}
