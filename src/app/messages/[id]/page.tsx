import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MessageThread } from '../../../components/messaging/MessageThread';
import { ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { isSupabaseConfigured } from '../../../lib/env';
import { isUuid } from '../../../lib/messaging/validation';
import { getVerifiedUser } from '../../../lib/supabase/server';

export const metadata: Metadata = { title: 'Conversation' };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  if (!isSupabaseConfigured()) {
    return <div className="space-y-6"><PageHeader title="Conversation" /><EmptyState icon="lock" title="Messaging is not configured" headingLevel={2}>Configure Supabase and apply the reviewed messaging migration to a development database.</EmptyState></div>;
  }
  const ctx = await getVerifiedUser();
  if (!ctx) {
    return <div className="space-y-6"><PageHeader title="Conversation" /><EmptyState icon="lock" title="Sign in to view this conversation" headingLevel={2} action={<ButtonLink href={`/login?next=${encodeURIComponent(`/messages/${id}`)}`}>Sign in</ButtonLink>}>Only participants can open a conversation.</EmptyState></div>;
  }

  // RLS hides conversations unless the signed-in caller is one of the two participants.
  const { data: conversation, error } = await ctx.supabase.from('conversations')
    .select('id, user_low, user_high').eq('id', id).maybeSingle();
  if (error || !conversation) notFound();
  const otherUserId = conversation.user_low === ctx.user.id ? conversation.user_high : conversation.user_low;
  const [profile, sendPermission, blocks] = await Promise.all([
    ctx.supabase.from('public_profiles').select('display_name').eq('id', otherUserId).maybeSingle(),
    ctx.supabase.rpc('messaging_send_allowed', { p_conversation_id: id }),
    ctx.supabase.rpc('my_blocked_member_ids'),
  ]);
  const blockedByMe = (blocks.data ?? []).some((row: { user_id: string }) => row.user_id === otherUserId);
  return (
    <div className="space-y-5">
      <PageHeader title="Messages" intro="A private conversation. Your messages are checked against the current messaging rules." />
      <MessageThread
        conversationId={id}
        currentUserId={ctx.user.id}
        otherUserId={otherUserId}
        otherDisplayName={profile.data?.display_name ?? 'Member'}
        initialCanSend={!sendPermission.error && sendPermission.data === true}
        initialBlockedByMe={blockedByMe}
      />
    </div>
  );
}
