'use client';

import { useActionState, useState } from 'react';
import { signInAction, signUpAction } from '../../app/auth/actions';
import type { FormState } from '../../lib/form-state';
import { Field, FormMessage, inputClasses } from '../ui/Field';
import { buttonClasses } from '../ui/Button';

const initial: FormState = {};

export function AuthForms({ next }: { next: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signIn, signInPending] = useActionState(signInAction, initial);
  const [signUpState, signUp, signUpPending] = useActionState(signUpAction, initial);

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-card border border-line bg-white p-6 shadow-soft">
      <div role="tablist" aria-label="Account" className="flex gap-2">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold ${mode === m ? 'bg-brand-blue text-ink' : 'border border-ink/25 bg-white'}`}
          >
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {mode === 'signin' ? (
        <form action={signIn} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          {signInState.error ? <FormMessage>{signInState.error}</FormMessage> : null}
          <Field id="si-email" label="Email" error={signInState.fieldErrors?.email}>
            <input id="si-email" name="email" type="email" autoComplete="email" required className={inputClasses} />
          </Field>
          <Field id="si-password" label="Password" error={signInState.fieldErrors?.password}>
            <input id="si-password" name="password" type="password" autoComplete="current-password" required className={inputClasses} />
          </Field>
          <button type="submit" disabled={signInPending} className={`${buttonClasses('primary')} w-full`}>
            {signInPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form action={signUp} className="space-y-4" noValidate>
          {signUpState.error ? <FormMessage>{signUpState.error}</FormMessage> : null}
          {signUpState.ok && signUpState.message ? <FormMessage ok>{signUpState.message}</FormMessage> : null}
          <Field id="su-name" label="Your name" error={signUpState.fieldErrors?.displayName}>
            <input id="su-name" name="displayName" type="text" autoComplete="name" maxLength={80} required className={inputClasses} />
          </Field>
          <Field id="su-email" label="Email" error={signUpState.fieldErrors?.email}>
            <input id="su-email" name="email" type="email" autoComplete="email" required className={inputClasses} />
          </Field>
          <Field id="su-password" label="Password" hint="At least 10 characters." error={signUpState.fieldErrors?.password}>
            <input id="su-password" name="password" type="password" autoComplete="new-password" minLength={10} required aria-describedby="su-password-hint" className={inputClasses} />
          </Field>
          <button type="submit" disabled={signUpPending} className={`${buttonClasses('primary')} w-full`}>
            {signUpPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  );
}
