export const MESSAGE_BODY_MAX_LENGTH = 2000;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OutgoingMessage {
  body: string;
  clientId: string;
}

export type MessageParseResult =
  | { ok: true; value: OutgoingMessage }
  | { ok: false; error: string };

/** Validate untrusted JSON for a message. Sender and conversation IDs are never accepted here. */
export function parseOutgoingMessage(input: unknown): MessageParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Invalid message request.' };
  }
  const value = input as Record<string, unknown>;
  if (typeof value.body !== 'string') return { ok: false, error: 'Enter a message.' };
  const body = value.body.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
  if (!body) return { ok: false, error: 'Enter a message.' };
  if (body.length > MESSAGE_BODY_MAX_LENGTH) {
    return { ok: false, error: `Messages must be ${MESSAGE_BODY_MAX_LENGTH} characters or fewer.` };
  }
  if (typeof value.clientId !== 'string' || !UUID_RE.test(value.clientId)) {
    return { ok: false, error: 'Refresh the page and try again.' };
  }
  return { ok: true, value: { body, clientId: value.clientId.toLowerCase() } };
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}


/** Validates a keyset cursor before its timestamp is placed in PostgREST filter syntax. */
export function isValidMessageCursor(createdAt: unknown, id: unknown): boolean {
  if (createdAt === null && id === null) return true;
  if (typeof createdAt !== 'string' || typeof id !== 'string') return false;
  const timestampLiteral = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
  return timestampLiteral.test(createdAt) && Number.isFinite(Date.parse(createdAt)) && isUuid(id);
}
