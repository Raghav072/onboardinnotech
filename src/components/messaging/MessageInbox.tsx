'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ConversationSummary } from '../../lib/messaging/types';

export function MessageInbox({ targetId }: { targetId?: string }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch('/api/messages', { cache: 'no-store' });
        const result = await response.json() as { conversations?: ConversationSummary[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Conversations could not be loaded.');
        if (alive) setConversations(result.conversations ?? []);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Conversations could not be loaded.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    async function start() {
      setStarting(true);
      setError('');
      try {
        const response = await fetch('/api/messages', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ targetId }),
        });
        const result = await response.json() as { conversationId?: string; error?: string };
        if (!response.ok || !result.conversationId) throw new Error(result.error ?? 'A conversation could not be started.');
        if (alive) router.replace(`/messages/${result.conversationId}`);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'A conversation could not be started.');
      } finally {
        if (alive) setStarting(false);
      }
    }
    void start();
    return () => { alive = false; };
  }, [targetId, router]);

  return (
    <section aria-labelledby="conversations-heading" className="rounded-card border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-5">
        <h2 id="conversations-heading" className="font-display text-lg font-semibold">Conversations</h2>
        <span className="text-xs text-muted">Private messages</span>
      </div>
      {starting ? <p role="status" className="px-5 py-4 text-sm text-muted">Checking messaging eligibility…</p> : null}
      {error ? <p role="alert" className="mx-4 my-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {loading ? <p role="status" className="px-5 py-8 text-sm text-muted">Loading conversations…</p> : null}
      {!loading && conversations.length === 0 && !error ? (
        <div className="px-5 py-9 text-center">
          <p className="font-semibold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted">Open an eligible member’s profile and choose Message to start one.</p>
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {conversations.map((conversation) => (
          <li key={conversation.conversation_id}>
            <Link href={`/messages/${conversation.conversation_id}`} className="block px-4 py-4 transition-colors hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold">{conversation.other_display_name || 'Member'}</p>
                {conversation.last_message_at ? <time className="shrink-0 text-xs text-muted" dateTime={conversation.last_message_at}>{new Date(conversation.last_message_at).toLocaleDateString()}</time> : null}
              </div>
              <p className="mt-1 line-clamp-2 break-words text-sm text-muted">{conversation.last_message_preview || 'Conversation started — say hello.'}</p>
              {conversation.other_kind ? <span className="mt-2 inline-block rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs capitalize text-ink">{conversation.other_kind}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
