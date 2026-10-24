import { privateNoStoreJson } from '../../../../lib/messaging/http';
import { getVerifiedUser } from '../../../../lib/supabase/server';
import { isUuid } from '../../../../lib/messaging/validation';

export async function GET() {
  const ctx = await getVerifiedUser();
  if (!ctx) return privateNoStoreJson({ error: 'Please sign in.' }, { status: 401 });
  const { data, error } = await ctx.supabase.rpc('my_blocked_member_ids');
  if (error) return privateNoStoreJson({ error: 'Block settings could not be loaded.' }, { status: 503 });
  return privateNoStoreJson({ blockedUserIds: (data ?? []).map((row: { user_id: string }) => row.user_id) });
}

export async function POST(request: Request) {
  const ctx = await getVerifiedUser();
  if (!ctx) return privateNoStoreJson({ error: 'Please sign in.' }, { status: 401 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return privateNoStoreJson({ error: 'Invalid request.' }, { status: 400 });
  }
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  if (!isUuid(value.targetId) || (value.action !== 'block' && value.action !== 'unblock')) {
    return privateNoStoreJson({ error: 'Invalid block request.' }, { status: 400 });
  }
  const functionName = value.action === 'block' ? 'block_member' : 'unblock_member';
  const { error } = await ctx.supabase.rpc(functionName, { p_target: value.targetId });
  if (error) return privateNoStoreJson({ error: 'The block setting could not be changed.' }, { status: 400 });
  return privateNoStoreJson({ ok: true, action: value.action, targetId: value.targetId });
}
