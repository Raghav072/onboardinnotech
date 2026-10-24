'use client';

import { useActionState } from 'react';
import { removeAvatarAction, updateProfileAction, uploadAvatarAction } from '../../app/profile/actions';
import type { FormState } from '../../lib/form-state';
import type { OwnProfile } from '../../lib/profile/types';
import { buttonClasses } from '../ui/Button';
import { Field, FormMessage, inputClasses } from '../ui/Field';

const initial: FormState = {};

export function ProfileEditor({ profile, avatarSrc }: { profile: OwnProfile; avatarSrc: string | null }) {
  const [state, save, pending] = useActionState(updateProfileAction, initial);
  const [upState, upload, uploading] = useActionState(uploadAvatarAction, initial);
  const [rmState, remove, removing] = useActionState(removeAvatarAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-8">
      <section aria-labelledby="photo-h" className="space-y-3 rounded-card border border-line bg-white p-6 shadow-soft">
        <h2 id="photo-h" className="font-display text-lg font-semibold">
          Profile photo
        </h2>
        <div className="flex items-center gap-4">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt="Your profile photo" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-blue/25 font-display text-2xl font-semibold" aria-hidden="true">
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <form action={upload} className="space-y-2">
            <label htmlFor="avatar" className="block text-sm font-semibold">
              Upload a photo
            </label>
            <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required className="block text-sm" />
            <p className="text-xs text-muted">JPEG, PNG or WebP, up to 2 MB.</p>
            <button type="submit" disabled={uploading} className={buttonClasses('secondary')}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>
        {upState.error ? <FormMessage>{upState.error}</FormMessage> : null}
        {upState.ok ? <FormMessage ok>{upState.message}</FormMessage> : null}
        {avatarSrc ? (
          <form action={remove}>
            <button type="submit" disabled={removing} className="text-sm font-medium text-brand-blue-text underline underline-offset-2">
              Remove photo
            </button>
            {rmState.error ? <FormMessage>{rmState.error}</FormMessage> : null}
          </form>
        ) : null}
      </section>

      <form action={save} className="space-y-5 rounded-card border border-line bg-white p-6 shadow-soft" noValidate>
        <h2 className="font-display text-lg font-semibold">Your details</h2>
        {state.error ? <FormMessage>{state.error}</FormMessage> : null}
        {state.ok ? <FormMessage ok>{state.message}</FormMessage> : null}

        <Field id="displayName" label="Name" error={fe.displayName}>
          <input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={80} required className={inputClasses} />
        </Field>
        <Field id="kind" label="I am a" error={fe.kind}>
          <select id="kind" name="kind" defaultValue={profile.kind} className={inputClasses}>
            <option value="student">Student</option>
            <option value="alumni">Alumnus / alumna</option>
          </select>
        </Field>
        <Field id="programme" label="Programme" error={fe.programme}>
          <input id="programme" name="programme" defaultValue={profile.programme ?? ''} maxLength={100} className={inputClasses} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="admissionYear" label="Admission year" error={fe.admissionYear}>
            <input id="admissionYear" name="admissionYear" inputMode="numeric" defaultValue={profile.admissionYear ?? ''} className={inputClasses} />
          </Field>
          <Field id="graduationYear" label="Graduation year (alumni)" error={fe.graduationYear}>
            <input id="graduationYear" name="graduationYear" inputMode="numeric" defaultValue={profile.graduationYear ?? ''} className={inputClasses} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="company" label="Company" error={fe.company}>
            <input id="company" name="company" defaultValue={profile.company ?? ''} maxLength={100} className={inputClasses} />
          </Field>
          <Field id="jobTitle" label="Role" error={fe.jobTitle}>
            <input id="jobTitle" name="jobTitle" defaultValue={profile.jobTitle ?? ''} maxLength={100} className={inputClasses} />
          </Field>
        </div>
        <Field id="bio" label="About you" hint="Up to 500 characters." error={fe.bio}>
          <textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={profile.bio} aria-describedby="bio-hint" className={`${inputClasses} py-2`} />
        </Field>
        <Field id="skills" label="Skills" hint="Comma-separated, up to 20." error={fe.skills}>
          <input id="skills" name="skills" defaultValue={profile.skills.join(', ')} aria-describedby="skills-hint" className={inputClasses} />
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Privacy</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="isPublic" defaultChecked={profile.isPublic} className="h-5 w-5" />
            Show my profile to other signed-in members
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="openToMentoring" defaultChecked={profile.openToMentoring} className="h-5 w-5" />
            Open to mentoring
          </label>
          <Field id="phone" label="Phone (private)" hint="Only you can see this. It is never shown on your public profile." error={fe.phone}>
            <input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ''} aria-describedby="phone-hint" className={inputClasses} />
          </Field>
          <p className="text-sm text-muted">
            Signed in as <span className="font-medium text-ink">{profile.email}</span>. Your email is private and is never shown to other members.
          </p>
        </fieldset>

        <button type="submit" disabled={pending} className={buttonClasses('primary')}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
