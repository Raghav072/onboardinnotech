'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import type { MessageRecord } from '../../lib/messaging/types';

interface PageResponse {
  messages?: MessageRecord[];
  hasMore?: boolean;
  nextCursor?: { createdAt: string; id: string } | null;
  canSend?: boolean;
  blockedByMe?: boolean;
  otherUserId?: string;
  otherDisplayName?: string;
  error?: string;
}

function mergeMessages(current: MessageRecord[], incoming: MessageRecord[]): MessageRecord[] {
  const merged = [...current];
  for (const message of incoming) {
    const index = merged.findIndex((item) => item.id === message.id || item.client_id === message.client_id);
    if (index >= 0) merged[index] = message;
    else merged.push(message);
  }
  return merged.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherUserId,
  otherDisplayName,
  initialCanSend,
  initialBlockedByMe,
}: {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherDisplayName: string;
  initialCanSend: boolean;
  initialBlockedByMe: boolean;
}) {
  const browserClient = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<{ createdAt: string; id: string } | null>(null);
  const retryAttemptRef = useRef<{ body: string; clientId: string } | null>(null);
  const [canSend, setCanSend] = useState(initialCanSend);
  const [blockedByMe, setBlockedByMe] = useState(initialBlockedByMe);
  const [sending, setSending] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<'harassment' | 'spam' | 'threats' | 'other'>('other');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportStatus, setReportStatus] = useState('');
  const [error, setError] = useState('');
  const [liveUpdates, setLiveUpdates] = useState(true);

  const loadPage = useCallback(async (older = false) => {
    const currentCursor = older ? cursorRef.current : null;
    const params = new URLSearchParams({ limit: '50' });
    if (currentCursor) {
      params.set('beforeCreatedAt', currentCursor.createdAt);
      params.set('beforeId', currentCursor.id);
    }
    const response = await fetch(`/api/messages/${conversationId}?${params.toString()}`, { cache: 'no-store' });
    const result = await response.json() as PageResponse;
    if (!response.ok) throw new Error(result.error ?? 'Messages could not be loaded.');
    const incoming = result.messages ?? [];
    setMessages((existing) => older ? mergeMessages(incoming, existing) : mergeMessages(existing, incoming));
    setHasMore(result.hasMore === true);
    cursorRef.current = result.nextCursor ?? null;
    setCanSend(result.canSend === true);
    setBlockedByMe(result.blockedByMe === true);
    setError('');
  }, [conversationId]);

  useEffect(() => {
    let alive = true;
    async function initialLoad() {
      setLoading(true);
      try {
        await loadPage(false);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Messages could not be loaded.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    void initialLoad();
    return () => { alive = false; };
  }, [loadPage]);

  useEffect(() => {
    if (!browserClient) {
      setLiveUpdates(false);
      return;
    }
    const channel = browserClient
      .channel(`message-room-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const row = payload.new as Partial<MessageRecord>;
        if (!row.id || !row.conversation_id || !row.sender_id || typeof row.body !== 'string' || !row.client_id || !row.created_at) return;
        if (row.conversation_id !== conversationId) return;
        setMessages((existing) => mergeMessages(existing, [row as MessageRecord]));
      })
      .subscribe((status) => {
        setLiveUpdates(status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT' && status !== 'CLOSED');
      });
    return () => { void browserClient.removeChannel(channel); };
  }, [browserClient, conversationId]);

  // If the realtime channel is unavailable, periodically refresh the latest page as a fallback.
  useEffect(() => {
    if (liveUpdates) return;
    const timer = setInterval(() => { void loadPage(false).catch(() => undefined); }, 20000);
    return () => clearInterval(timer);
  }, [liveUpdates, loadPage]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || !canSend || !draft.trim()) return;
    const body = draft.trim();
    if (body.length > 2000) {
      setError('Messages must be 2000 characters or fewer.');
      return;
    }
    // Preserve the same retry key if a previous request may have reached the server but its
    // response was lost. A different body always gets a new key.
    const retryAttempt = retryAttemptRef.current;
    const clientId = retryAttempt?.body === body ? retryAttempt.clientId : crypto.randomUUID();
    retryAttemptRef.current = { body, clientId };
    const optimistic: MessageRecord = {
      id: `pending:${clientId}`, conversation_id: conversationId, sender_id: currentUserId,
      body, client_id: clientId, created_at: new Date().toISOString(),
    };
    setMessages((existing) => mergeMessages(existing, [optimistic]));
    setDraft('');
    setSending(true);
    setError('');
    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, clientId }),
      });
      const result = await response.json() as { message?: MessageRecord; error?: string };
      if (!response.ok || !result.message) {
        setMessages((existing) => existing.filter((item) => item.client_id !== clientId));
        if (response.status === 403) setCanSend(false);
        throw new Error(result.error ?? 'Your message could not be sent.');
      }
      setMessages((existing) => mergeMessages(existing, [result.message as MessageRecord]));
      if (retryAttemptRef.current?.clientId === clientId) retryAttemptRef.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your message could not be sent.');
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const changeBlock = async () => {
    if (blockBusy) return;
    setBlockBusy(true);
    setError('');
    try {
      const response = await fetch('/api/messages/blocks', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetId: otherUserId, action: blockedByMe ? 'unblock' : 'block' }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Block setting could not be changed.');
      const nextBlocked = !blockedByMe;
      setBlockedByMe(nextBlocked);
      if (nextBlocked) setCanSend(false);
      else await loadPage(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Block setting could not be changed.');
    } finally {
      setBlockBusy(false);
    }
  };

  const submitReport = async (messageId: string) => {
    if (reportBusy) return;
    setReportBusy(true);
    setReportStatus('');
    try {
      const response = await fetch('/api/messages/reports', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messageId, reason: reportReason }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'This message could not be reported.');
      setReportStatus('Report submitted. Thank you.');
      setReportingMessageId(null);
    } catch (cause) {
      setReportStatus(cause instanceof Error ? cause.message : 'This message could not be reported.');
    } finally { setReportBusy(false); }
  };

  const otherLabel = otherDisplayName || 'Member';
  return (
    <section className="overflow-hidden rounded-card border border-line bg-white" aria-label={`Conversation with ${otherLabel}`}>
      <header className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <Link href="/messages" className="text-sm font-semibold text-brand-blue-text underline underline-offset-4">← All messages</Link>
          <h2 className="mt-2 truncate font-display text-xl font-bold">{otherLabel}</h2>
          <p className="mt-1 text-xs text-muted">Messages are private to conversation participants.</p>
        </div>
        <button type="button" onClick={changeBlock} disabled={blockBusy} className="inline-flex min-h-10 items-center justify-center rounded-full border border-ink/25 px-4 text-sm font-semibold hover:bg-canvas disabled:opacity-60">
          {blockBusy ? 'Saving…' : blockedByMe ? 'Unblock member' : 'Block member'}
        </button>
      </header>

      {!liveUpdates ? <p className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">Live updates are unavailable. This conversation will refresh periodically.</p> : null}
      {error ? <p role="alert" className="mx-4 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      <div className="min-h-72 space-y-3 p-4 sm:p-5" aria-live="polite" aria-relevant="additions text">
        {hasMore ? (
          <div className="text-center">
            <button type="button" disabled={olderLoading} className="min-h-10 rounded-full border border-ink/20 px-4 text-sm font-semibold hover:bg-canvas disabled:opacity-60" onClick={async () => {
              setOlderLoading(true);
              try { await loadPage(true); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Older messages could not be loaded.'); }
              finally { setOlderLoading(false); }
            }}>{olderLoading ? 'Loading…' : 'Load older messages'}</button>
          </div>
        ) : null}
        {loading ? <p role="status" className="py-8 text-center text-sm text-muted">Loading messages…</p> : null}
        {!loading && messages.length === 0 ? <p className="py-8 text-center text-sm text-muted">No messages yet. Start the conversation below.</p> : null}
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          const pending = message.id.startsWith('pending:');
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <article className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${mine ? 'rounded-br-md bg-brand-blue/20 text-ink' : 'rounded-bl-md bg-canvas text-ink'}`}>
                <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                <p className={`mt-2 text-[11px] ${mine ? 'text-ink/70' : 'text-muted'}`}>
                  {formatMessageTime(message.created_at)}{pending ? ' · Sending…' : ''}
                </p>
                {!mine && !pending ? (
                  <div className="mt-2 border-t border-ink/10 pt-2">
                    {reportingMessageId === message.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`report-reason-${message.id}`}>Report reason</label>
                        <select id={`report-reason-${message.id}`} value={reportReason} onChange={(event) => setReportReason(event.target.value as 'harassment' | 'spam' | 'threats' | 'other')} className="min-h-8 rounded-lg border border-ink/20 bg-white px-2 text-xs">
                          <option value="harassment">Harassment</option><option value="spam">Spam</option><option value="threats">Threats or safety</option><option value="other">Other concern</option>
                        </select>
                        <button type="button" disabled={reportBusy} onClick={() => void submitReport(message.id)} className="min-h-8 rounded-full bg-brand-yellow px-3 text-xs font-semibold disabled:opacity-60">{reportBusy ? 'Sending…' : 'Submit report'}</button>
                        <button type="button" onClick={() => setReportingMessageId(null)} className="min-h-8 rounded-full px-2 text-xs underline underline-offset-2">Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setReportStatus(''); setReportingMessageId(message.id); }} className="text-xs text-muted underline underline-offset-2 hover:text-ink">Report message</button>
                    )}
                  </div>
                ) : null}
              </article>
            </div>
          );
        })}
      </div>

      {reportStatus ? <p role="status" className="border-t border-line bg-canvas px-4 py-2 text-sm text-muted">{reportStatus}</p> : null}
      <form onSubmit={send} className="border-t border-line p-4 sm:p-5">
        {!canSend ? (
          <p className="mb-3 rounded-lg bg-canvas px-3 py-3 text-sm text-muted">
            {blockedByMe ? 'You blocked this member. Unblock them to send another message.' : 'New messages are unavailable because of the messaging rules or a block. Existing history remains available.'}
          </p>
        ) : null}
        <label htmlFor="message-body" className="mb-2 block text-sm font-semibold">Your message</label>
        <textarea id="message-body" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={3} disabled={!canSend || sending} placeholder={canSend ? 'Write a message…' : 'Messaging is unavailable'} className="w-full resize-y rounded-xl border border-ink/20 bg-white px-3 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:bg-canvas" />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">{draft.length}/2000 characters</p>
          <button type="submit" disabled={!canSend || sending || !draft.trim()} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-blue px-5 text-sm font-semibold text-ink hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  );
}
