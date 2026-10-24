import { privateNoStoreJson } from '../../../lib/messaging/http';
import { getVerifiedUser } from '../../../lib/supabase/server';
import { isUuid } from '../../../lib/messaging/validation';

export async function GET() {
  const ctx = await getVerifiedUser();
  if (!ctx) return privateNoStoreJson({ error: 'Please sign in to view messages.' }, { status: 401 });
  const { data, error } = await ctx.supabase.rpc('my_conversations', { p_limit: 50 });
  if (error) return privateNoStoreJson({ error: 'Conversations could not be loaded.' }, { status: 503 });
  return privateNoStoreJson({ conversations: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getVerifiedUser();
  if (!ctx) return privateNoStoreJson({ error: 'Please sign in to start a conversation.' }, { status: 401 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return privateNoStoreJson({ error: 'Invalid request.' }, { status: 400 });
  }
  const targetId = input && typeof input === 'object' ? (input as Record<string, unknown>).targetId : null;
  if (!isUuid(targetId)) return privateNoStoreJson({ error: 'Choose a valid member.' }, { status: 400 });
  const { data, error } = await ctx.supabase.rpc('start_conversation', { p_target: targetId });
  if (error || !isUuid(data)) {
    return privateNoStoreJson({ error: 'You cannot start a conversation with this member right now.' }, { status: 403 });
  }
  return privateNoStoreJson({ conversationId: data });
}
