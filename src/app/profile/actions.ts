'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '../../lib/form-state';
import { getVerifiedUser } from '../../lib/supabase/server';
import { checkAvatar } from '../../lib/validation/avatar';
import { parseProfileForm, toProfileRow } from '../../lib/validation/profile';

const SIGNED_OUT: FormState = { error: 'Please sign in again.' };
const GENERIC: FormState = { error: 'Something went wrong. Please try again.' };

/**
 * Authorization model for every action here: the target row is ALWAYS the verified
 * caller (`user.id` from getUser()). No id, role, or path is ever taken from the form.
 * Row Level Security and column grants enforce the same rule again in the database.
 */
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getVerifiedUser();
  if (!ctx) return SIGNED_OUT;
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.errors };

  const { supabase, user } = ctx;
  const { error } = await supabase.from('profiles').update(toProfileRow(parsed.data)).eq('id', user.id);
  if (error) return GENERIC;
  const phone = await supabase.from('private_profiles').update({ phone: parsed.data.phone }).eq('id', user.id);
  if (phone.error) return GENERIC;
  revalidatePath('/profile');
  return { ok: true, message: 'Profile saved.' };
}

export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getVerifiedUser();
  if (!ctx) return SIGNED_OUT;
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose an image file.' };
  if (file.size > 2 * 1024 * 1024) return { error: 'Image must be 2 MB or smaller.' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkAvatar(bytes, file.type);
  if (!check.ok) return { error: check.error };

  const { supabase, user } = ctx;
  const existing = await supabase.from('profiles').select('avatar_path').eq('id', user.id).maybeSingle();
  if (existing.error) return GENERIC;
  const oldPath = (existing.data?.avatar_path as string | null | undefined) ?? null;

  // Server-chosen path inside the caller's own folder; the client name is ignored.
  const path = `${user.id}/${crypto.randomUUID().replace(/-/g, '')}.${check.ext}`;
  const up = await supabase.storage.from('avatars').upload(path, bytes, { contentType: check.contentType, upsert: false, cacheControl: '3600' });
  if (up.error) return GENERIC;

  const upd = await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.id);
  if (upd.error) {
    await supabase.storage.from('avatars').remove([path]); // do not leave an orphan
    return GENERIC;
  }
  if (oldPath && oldPath !== path) await supabase.storage.from('avatars').remove([oldPath]);
  revalidatePath('/profile');
  return { ok: true, message: 'Photo updated.' };
}

export async function removeAvatarAction(_prev: FormState): Promise<FormState> {
  const ctx = await getVerifiedUser();
  if (!ctx) return SIGNED_OUT;
  const { supabase, user } = ctx;
  const existing = await supabase.from('profiles').select('avatar_path').eq('id', user.id).maybeSingle();
  if (existing.error) return GENERIC;
  const oldPath = (existing.data?.avatar_path as string | null | undefined) ?? null;
  const upd = await supabase.from('profiles').update({ avatar_path: null }).eq('id', user.id);
  if (upd.error) return GENERIC;
  if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
  revalidatePath('/profile');
  return { ok: true, message: 'Photo removed.' };
}
