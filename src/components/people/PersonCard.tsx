import Link from 'next/link';
import { Avatar } from './Avatar';
import { ProgrammeBadge } from './ProgrammeBadge';
import { Chip, SampleChip } from '../ui/Chip';
import { describeStanding } from '../../lib/academic-year';
import type { PersonView } from '../../lib/discovery/person';

export function personSubtitle(person: PersonView): string {
  if (person.kind === 'alumni') return person.graduationYear ? `Class of ${person.graduationYear}` : 'Alumni';
  return person.standing ? describeStanding(person.standing) : '';
}

export function PersonCard({ person }: { person: PersonView }) {
  return (
    <article className="relative flex flex-col gap-3 rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <Avatar name={person.name} ring={person.ring} size="lg" />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight">
            <Link href={`/people/${person.id}`} className="after:absolute after:inset-0 after:rounded-card">
              {person.name}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {person.programme ? <ProgrammeBadge label={person.programme} /> : null}
            <span className="text-sm text-muted">{personSubtitle(person)}</span>
          </div>
        </div>
      </div>
      {person.kind === 'alumni' && person.role && person.company ? (
        <p className="text-sm">
          {person.role} at {person.company}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
        {person.skills.slice(0, 3).map((skill) => (
          <li key={skill}>
            <Chip>{skill}</Chip>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-2">
        {person.isSample ? <SampleChip /> : null}
        {person.isVerified ? <Chip tone="dark">Verified</Chip> : null}
        {person.kind === 'alumni' && person.openToMentoring ? <Chip tone="selected">Open to mentoring</Chip> : null}
      </div>
    </article>
  );
}
