export interface Contact {
  id: number;

  name?: string;

  phone: string;
}

export interface Conversation {
  id: number;

  status: string;

  last_message?: string;

  last_message_at?: string;

  contact: Contact;
  unread_count: number;
}