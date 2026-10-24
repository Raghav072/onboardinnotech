import { privateNoStoreJson } from '../../../../lib/messaging/http';
import { getVerifiedUser } from '../../../../lib/supabase/server';
import { isValidMessageCursor, isUuid, parseOutgoingMessage } from '../../../../lib/messaging/validation';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const ctx = await getVerifiedUser();
  if (!ctx) return privateNoStoreJson({ error: 'Please sign in to view messages.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return privateNoStoreJson({ error: 'Conversation not found.' }, { status: 404 });

  const { data: conversation, error: conversationError } = await ctx.supabase
    .from('conversations').select('id, user_low, user_high').eq('id', id).maybeSingle();
  if (conversationError || !conversation) return privateNoStoreJson({ error: 'Conversation not found.' }, { status: 404 });
  const otherUserId = conversation.user_low === ctx.user.id ? conversation.user_high : conversation.user_low;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? 50);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 50;
  const beforeCreatedAt = url.searchParams.get('beforeCreatedAt');
  const beforeId = url.searchParams.get('beforeId');
  // Validate the timestamp's literal format before embedding it in PostgREST's `.or()` grammar.
  if (!isValidMessageCursor(beforeCreatedAt, beforeId)) {
    return privateNoStoreJson({ error: 'Invalid message page cursor.' }, { status: 400 });
  }

  let query = ctx.supabase.from('messages')
    .select('id, conversation_id, sender_id, body, client_id, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  if (beforeCreatedAt && beforeId) {
    query = query.or(`created_at.lt.${beforeCreatedAt},and(created_at.eq.${beforeCreatedAt},id.lt.${beforeId})`);
  }
  const { data: rows, error: messageError } = await query;
  if (messageError) return privateNoStoreJson({ error: 'Messages could not be loaded.' }, { status: 503 });
  const fetched = rows ?? [];
  const hasMore = fetched.length > limit;
  const page = fetched.slice(0, limit);
  const oldest = page[page.length - 1];

  const [profileResult, canSendResult, blocksResult] = await Promise.all([
    ctx.supabase.from('public_profiles').select('display_name').eq('id', otherUserId).maybeSingle(),
    ctx.supabase.rpc('messaging_send_allowed', { p_conversation_id: id }),
    ctx.supabase.rpc('my_blocked_member_ids'),
  ]);
  const blockedByMe = (blocksResult.data ?? []).some((row: { user_id: string }) => row.user_id === otherUserId);
  return privateNoStoreJson({
    messages: page.reverse(),
    hasMore,
    nextCursor: hasMore && oldest ? { createdAt: oldest.created_at, id: oldest.id } : null,
    canSend: canSendResult.error ? false : canSendResult.data === true,
    blockedByMe,
    otherUserId,
    otherDisplayName: profileResult.data?.display_name ?? 'Member',
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const ctx = await getVerifiedUser();
  if (!ctx) return privateNoStoreJson({ error: 'Please sign in to send messages.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return privateNoStoreJson({ error: 'Conversation not found.' }, { status: 404 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return privateNoStoreJson({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = parseOutgoingMessage(input);
  if (!parsed.ok) return privateNoStoreJson({ error: parsed.error }, { status: 400 });

  const { data, error } = await ctx.supabase.from('messages').upsert({
    conversation_id: id,
    sender_id: ctx.user.id,
    body: parsed.value.body,
    client_id: parsed.value.clientId,
  }, { onConflict: 'conversation_id,sender_id,client_id', ignoreDuplicates: true })
    .select('id, conversation_id, sender_id, body, client_id, created_at').maybeSingle();
  if (error) {
    const isRateLimit = error.message.toLowerCase().includes('rate limit');
    const status = isRateLimit ? 429 : error.code === '42501' ? 403 : error.code === '22023' ? 400 : 503;
    const message = isRateLimit
      ? 'You are sending messages too quickly. Please wait a minute and try again.'
      : status === 403
        ? 'Messaging is unavailable for this member. Eligibility or block status may have changed.'
        : status === 400 ? 'Messages must be 1 to 2000 characters.' : 'Your message could not be sent. Please try again.';
    return privateNoStoreJson({ error: message }, { status });
  }

  // An idempotent retry can hit the unique constraint and return no representation. Read the
  // caller's own retry key through message RLS so the client can reconcile the optimistic item.
  let result = data;
  if (!result) {
    const { data: existing, error: existingError } = await ctx.supabase.from('messages')
      .select('id, conversation_id, sender_id, body, client_id, created_at')
      .eq('conversation_id', id).eq('sender_id', ctx.user.id).eq('client_id', parsed.value.clientId).maybeSingle();
    if (existingError || !existing) return privateNoStoreJson({ error: 'Your message could not be confirmed. Refresh the conversation.' }, { status: 503 });
    result = existing;
  }
  return privateNoStoreJson({ message: result });
}
