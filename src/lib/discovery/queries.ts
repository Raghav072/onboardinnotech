import { UUID_RE } from '../profile/types.ts';
import { PAGE_SIZE, toRpcArgs } from './params.ts';
import type { ParsedDirectoryRequest } from './params.ts';
import type { DirectoryEntry } from './person.ts';

/**
 * The only thing discovery needs from Supabase: calling one database function.
 * Deliberately has no `.from()`, so this module cannot query a table.
 */
export interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
}

export type SearchOutcome =
  | { ok: true; entries: DirectoryEntry[]; total: number; page: number; pageCount: number; outOfRange: boolean }
  | { ok: false };

const SEARCH_FN = 'search_public_profiles';

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}
function int(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

/**
 * Copies ONLY the approved fields out of a database row. Anything else the row happens to
 * contain is dropped here, so a future change to the SQL function cannot leak a column to
 * the page by accident. Rows with an invalid id or name are discarded.
 */
export function toDirectoryEntry(row: unknown): DirectoryEntry | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === 'string' && UUID_RE.test(r.id) ? r.id : null;
  const displayName = str(r.display_name);
  const kind = r.kind === 'student' || r.kind === 'alumni' ? r.kind : null;
  if (!id || !displayName || !kind) return null;
  return {
    id,
    displayName,
    kind,
    programme: str(r.programme),
    admissionYear: int(r.admission_year),
    graduationYear: int(r.graduation_year),
    company: str(r.company),
    jobTitle: str(r.job_title),
    skills: Array.isArray(r.skills) ? r.skills.filter((s): s is string => typeof s === 'string').slice(0, 20) : [],
    openToMentoring: r.open_to_mentoring === true,
    isVerified: r.is_verified === true,
  };
}

export async function searchDirectory(client: RpcClient, req: ParsedDirectoryRequest, now: Date = new Date()): Promise<SearchOutcome> {
  let result;
  try {
    result = await client.rpc(SEARCH_FN, toRpcArgs(req, now));
  } catch {
    console.error('discovery: search request failed');
    return { ok: false };
  }
  if (result.error || !Array.isArray(result.data)) {
    // Log the error code only; never the message, which may echo query text or internals.
    console.error('discovery: search failed', result.error?.code ?? 'unexpected response');
    return { ok: false };
  }
  const rows = result.data as unknown[];
  const entries = rows.map(toDirectoryEntry).filter((e): e is DirectoryEntry => e !== null);
  const first = rows[0] as Record<string, unknown> | undefined;
  const reported = first && typeof first.total_count === 'number' ? first.total_count : Number(first?.total_count);
  const total = Number.isFinite(reported) && reported >= 0 ? Math.min(reported, Number.MAX_SAFE_INTEGER) : entries.length;
  return {
    ok: true,
    entries,
    total,
    page: req.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    outOfRange: req.page > 1 && rows.length === 0,
  };
}
