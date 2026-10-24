import type { SupabaseClient } from '@supabase/supabase-js';
import { UUID_RE } from './types';
import type { OwnProfile, PublicProfile } from './types';

/** The signed-in user's own profile (RLS limits both tables to their own row). */
export async function getOwnProfile(supabase: SupabaseClient, userId: string): Promise<OwnProfile | null> {
  const [p, priv] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, kind, programme, admission_year, graduation_year, company, job_title, bio, skills, open_to_mentoring, is_public, avatar_path, verification_status')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('private_profiles').select('email, phone').eq('id', userId).maybeSingle(),
  ]);
  if (p.error || !p.data) return null;
  const r = p.data;
  return {
    id: r.id,
    displayName: r.display_name,
    kind: r.kind,
    programme: r.programme,
    admissionYear: r.admission_year,
    graduationYear: r.graduation_year,
    company: r.company,
    jobTitle: r.job_title,
    bio: r.bio,
    skills: r.skills ?? [],
    openToMentoring: r.open_to_mentoring,
    isPublic: r.is_public,
    avatarPath: r.avatar_path,
    verificationStatus: r.verification_status,
    email: priv.data?.email ?? '',
    phone: priv.data?.phone ?? null,
  };
}

/** Another member's public profile, via the safe `public_profiles` view only. */
export async function getPublicProfile(supabase: SupabaseClient, id: string): Promise<PublicProfile | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, display_name, kind, programme, admission_year, graduation_year, company, job_title, bio, skills, open_to_mentoring, avatar_path, is_verified')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    kind: data.kind,
    programme: data.programme,
    admissionYear: data.admission_year,
    graduationYear: data.graduation_year,
    company: data.company,
    jobTitle: data.job_title,
    bio: data.bio,
    skills: data.skills ?? [],
    openToMentoring: data.open_to_mentoring,
    avatarPath: data.avatar_path,
    isVerified: data.is_verified,
  };
}

/** Short-lived signed URL for an avatar; storage policies decide who may get one. */
export async function avatarUrl(supabase: SupabaseClient, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}
