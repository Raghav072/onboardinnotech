export interface ConversationSummary {
  conversation_id: string;
  other_user_id: string;
  other_display_name: string;
  other_kind: 'student' | 'alumni' | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  client_id: string;
  created_at: string;
}

export interface MessagePage {
  messages: MessageRecord[];
  hasMore: boolean;
  nextCursor: { createdAt: string; id: string } | null;
  canSend: boolean;
  blockedByMe: boolean;
  otherUserId: string;
  otherDisplayName: string;
}
