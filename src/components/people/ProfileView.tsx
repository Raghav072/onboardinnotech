import Link from 'next/link';
import { Avatar } from './Avatar';
import { ProgrammeBadge } from './ProgrammeBadge';
import { Chip, SampleChip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { buttonClasses, DisabledButton } from '../ui/Button';
import { SectionHeading } from '../ui/PageHeader';
import { describeStanding } from '../../lib/academic-year';
import type { PersonView } from '../../lib/discovery/person';
import { personSubtitle } from './PersonCard';

export function ProfileView({ person, headingTag = 'h1', messageHref = null }: { person: PersonView; headingTag?: 'h1' | 'h2'; messageHref?: string | null }) {
  const Heading = headingTag;
  const standing = person.standing;
  return (
    <article aria-labelledby="profile-name" className="space-y-8">
      <div className="flex flex-col gap-5 rounded-card border border-line bg-white p-6 shadow-soft sm:flex-row sm:items-center">
        <Avatar name={person.name} ring={person.ring} size="xl" />
        <div className="min-w-0 flex-1">
          <Heading id="profile-name" className="font-display text-3xl font-bold tracking-tight">
            {person.name}
          </Heading>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {person.programme ? <ProgrammeBadge label={person.programme} /> : null}
            <span className="text-muted">{personSubtitle(person)}</span>
            {standing && standing.status === 'current' ? <span className="sr-only">{describeStanding(standing)}</span> : null}
            {person.isSample ? <SampleChip /> : null}
            {person.isVerified ? <Chip tone="dark">Verified</Chip> : null}
          </div>
          {person.kind === 'alumni' && person.role && person.company ? (
            <p className="mt-2">
              {person.role} at {person.company}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-2">
          {messageHref ? (
            <Link href={messageHref} className={buttonClasses('primary')}>
              <Icon name="message" className="h-4 w-4" />
              Message
            </Link>
          ) : (
            <DisabledButton hint={person.isSample ? 'Sample profiles cannot start real conversations.' : 'Messaging is unavailable under the current eligibility or block rules.'}>
              <Icon name="message" className="h-4 w-4" />
              Message
            </DisabledButton>
          )}
          <p className="max-w-[16rem] text-xs text-muted">
            {person.isSample ? 'Sample profiles are for preview only.' : messageHref ? 'Your conversation is checked by the server and database.' : 'Messaging may be unavailable because of year-of-study, mentoring, privacy, or block rules.'}
          </p>
        </div>
      </div>

      <section aria-labelledby="about">
        <SectionHeading id="about" title="About" />
        {person.bio ? <p className="max-w-prose whitespace-pre-line">{person.bio}</p> : <p className="text-muted">No bio yet.</p>}
        {person.kind === 'alumni' && person.openToMentoring ? (
          <p className="mt-3">
            <Chip tone="selected">Open to mentoring</Chip>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="skills">
        <SectionHeading id="skills" title="Skills" />
        {person.skills.length === 0 ? <p className="text-muted">No skills listed.</p> : null}
        <ul className="flex flex-wrap gap-2">
          {person.skills.map((s) => (
            <li key={s}>
              <Chip>{s}</Chip>
            </li>
          ))}
        </ul>
      </section>

      {person.projects.length > 0 ? (
        <section aria-labelledby="projects">
          <SectionHeading id="projects" title="Projects" />
          <ul className="list-disc space-y-1 pl-5">
            {person.projects.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {person.experience.length > 0 ? (
        <section aria-labelledby="experience">
          <SectionHeading id="experience" title="Experience" />
          <ul className="space-y-3">
            {person.experience.map((e) => (
              <li key={e.title} className="rounded-tile border border-line bg-white p-4">
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-muted">{e.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="flex items-center gap-2 text-sm text-muted">
        <Icon name="lock" className="h-4 w-4" />
        Email and phone are never shown on profiles.
      </p>
    </article>
  );
}
