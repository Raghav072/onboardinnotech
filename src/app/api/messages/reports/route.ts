import { privateNoStoreJson } from '../../../../lib/messaging/http';
import { getVerifiedUser } from '../../../../lib/supabase/server';
import { isUuid } from '../../../../lib/messaging/validation';

const REASONS = new Set(['harassment', 'spam', 'threats', 'other']);

export async function POST(request: Request) {
  const ctx = await getVerifiedUser();
  if (!ctx) return privateNoStoreJson({ error: 'Please sign in to report a message.' }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return privateNoStoreJson({ error: 'Invalid request.' }, { status: 400 }); }
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  if (!isUuid(value.messageId) || typeof value.reason !== 'string' || !REASONS.has(value.reason) || (value.details !== undefined && typeof value.details !== 'string')) {
    return privateNoStoreJson({ error: 'Choose a valid report reason.' }, { status: 400 });
  }
  const details = typeof value.details === 'string' ? value.details.trim().slice(0, 1000) : null;
  const { error } = await ctx.supabase.rpc('report_message', { p_message_id: value.messageId, p_reason: value.reason, p_details: details });
  if (error) return privateNoStoreJson({ error: 'This message could not be reported.' }, { status: 400 });
  return privateNoStoreJson({ ok: true });
}
