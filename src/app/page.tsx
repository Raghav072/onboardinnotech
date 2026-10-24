import Link from 'next/link';
import { Avatar } from '../components/people/Avatar';
import { ButtonLink } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { MockBanner } from '../components/ui/MockBanner';
import { MOCK_LISTINGS, formatPrice } from '../lib/mock/listings';
import { MOCK_PEOPLE, standingFor } from '../lib/mock/people';
import { ringKeyForStanding } from '../lib/academic-year';

const ITEM_ART: Record<string, { emoji: string; bg: string }> = {
  'sample-bicycle': { emoji: '🚲', bg: 'from-sky-100 to-blue-200' },
  'sample-calculator': { emoji: '🧮', bg: 'from-amber-100 to-yellow-200' },
  'sample-keyboard': { emoji: '⌨️', bg: 'from-violet-100 to-pink-100' },
  'sample-lamp': { emoji: '💡', bg: 'from-yellow-100 to-orange-100' },
  'sample-kettle': { emoji: '☕', bg: 'from-orange-100 to-amber-200' },
  'sample-drawing-kit': { emoji: '📐', bg: 'from-emerald-100 to-teal-100' },
};

const SHORTCUTS = [
  { href: '/discover', icon: 'users' as const, title: 'Find your people', detail: 'Meet students across years', tone: 'blue' },
  { href: '/alumni', icon: 'cap' as const, title: 'Learn from alumni', detail: 'Explore careers and mentors', tone: 'yellow' },
  { href: '/marketplace', icon: 'bag' as const, title: 'Campus marketplace', detail: 'Buy, sell, rent or give away', tone: 'pink' },
  { href: '/campus', icon: 'calendar' as const, title: 'What’s happening', detail: 'Explore campus information', tone: 'amber' },
];

export default function HomePage() {
  const listings = MOCK_LISTINGS.filter((item) => item.status === 'available').slice(0, 3);
  const people = MOCK_PEOPLE.filter((person) => person.kind === 'student').slice(0, 4);

  return (
    <div className="home-page space-y-8 md:space-y-10">
      <MockBanner>Presentation preview: people and marketplace listings are fictional sample data. Messages and transactions should be tested against your configured backend before being presented as live.</MockBanner>

      <section aria-labelledby="welcome" className="home-hero relative isolate overflow-hidden rounded-[28px] bg-[#102544] p-6 text-white shadow-soft sm:p-8 lg:p-10">
        <div aria-hidden="true" className="hero-orb hero-orb-one" />
        <div aria-hidden="true" className="hero-orb hero-orb-two" />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
              <span className="h-2 w-2 rounded-full bg-[#FFF83F]" />
              BUILT FOR KIET · MADE FOR CAMPUS LIFE
            </div>
            <h1 id="welcome" className="font-display text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              Your campus.<br />Your people. <span className="text-[#FFF83F]">One place.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
              Meet people beyond your classroom, connect with alumni, and find the essentials that make student life easier.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/discover">Explore the community <span aria-hidden="true">↗</span></ButtonLink>
              <Link href="/marketplace" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Browse marketplace</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2"><Icon name="shield" className="h-4 w-4 text-[#FFF83F]" /> University-focused community</span>
              <span className="inline-flex items-center gap-2"><Icon name="users" className="h-4 w-4 text-[#FFF83F]" /> Students + alumni</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[390px] lg:ml-auto">
            <div className="hero-float-card hero-float-card-top">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF83F] text-xl">✦</div>
                <div><p className="text-sm font-bold text-[#102544]">Find your circle</p><p className="mt-0.5 text-xs text-slate-500">People who share your interests</p></div>
              </div>
              <div className="mt-4 flex items-center pl-1">
                {people.slice(0, 4).map((person, index) => <span key={person.id} className={index ? '-ml-2' : ''}><Avatar name={person.name} ring={ringKeyForStanding(standingFor(person))} size="md" /></span>)}
                <span className="ml-3 text-xs font-semibold text-slate-600">Across every year</span>
              </div>
            </div>
            <div className="hero-illustration" aria-hidden="true">
              <div className="hero-illustration-ring" />
              <div className="hero-illustration-mark">O</div>
              <span className="hero-spark hero-spark-a">✦</span><span className="hero-spark hero-spark-b">✳</span>
              <span className="hero-pill hero-pill-blue">DISCOVER</span><span className="hero-pill hero-pill-yellow">CONNECT</span>
            </div>
            <div className="hero-float-card hero-float-card-bottom">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F70063]/10 text-xl">🛍️</div>
                <div className="min-w-0"><p className="text-sm font-bold text-[#102544]">Made for campus needs</p><p className="mt-0.5 text-xs text-slate-500">From study gear to hostel essentials</p></div>
                <span className="ml-auto text-lg text-[#2391FF]">↗</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="start-here">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="home-eyebrow">YOUR CAMPUS, SIMPLIFIED</p><h2 id="start-here" className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">What would you like to do?</h2></div>
          <span className="hidden text-sm text-muted sm:block">A few good places to start</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((item) => (
            <Link key={item.href} href={item.href} className="shortcut-card group flex items-start gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-1 hover:border-brand-blue/50">
              <span className={`shortcut-icon shortcut-${item.tone}`}><Icon name={item.icon} className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1"><span className="block font-display text-base font-bold text-ink">{item.title}</span><span className="mt-1 block text-sm leading-5 text-muted">{item.detail}</span></span>
              <span className="mt-1 text-lg text-muted transition group-hover:translate-x-1 group-hover:text-brand-blue-text" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="market-picks" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="home-eyebrow">SMARTER CAMPUS FINDS</p><h2 id="market-picks" className="mt-1 font-display text-2xl font-bold tracking-tight">Around the marketplace</h2><p className="mt-1 text-sm text-muted">Useful finds, shared within your campus community.</p></div>
            <Link href="/marketplace" className="shrink-0 text-sm font-bold text-brand-blue-text hover:underline">View all <span aria-hidden="true">→</span></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const art = ITEM_ART[listing.id] ?? { emoji: '📦', bg: 'from-sky-100 to-blue-100' };
              return (
                <article key={listing.id} className="home-product-card group relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition hover:-translate-y-1">
                  <Link href={`/marketplace/${listing.id}`} aria-label={`View ${listing.title}`} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-ink" />
                  <div className={`product-artwork flex h-36 items-center justify-center bg-gradient-to-br ${art.bg}`}><span className="product-emoji" aria-hidden="true">{art.emoji}</span><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">{listing.transaction === 'rent' ? 'For rent' : listing.transaction === 'giveaway' ? 'Free' : 'For sale'}</span></div>
                  <div className="p-4"><p className="text-xs font-medium text-muted">{listing.subcategory}</p><h3 className="mt-1 line-clamp-1 font-display text-base font-bold text-ink">{listing.title}</h3><div className="mt-3 flex items-center justify-between gap-2"><span className="text-lg font-bold text-ink">{formatPrice(listing)}</span><span className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-ink transition group-hover:bg-brand-blue">↗</span></div></div>
                </article>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Sample listings for presentation only. No real purchases or payments are made here.</p>
        </div>

        <aside className="campus-side-card rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3"><div><p className="home-eyebrow">BUILT AROUND YOU</p><h2 className="mt-1 font-display text-xl font-bold">Campus life, connected.</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF83F] text-xl">✳</span></div>
          <p className="mt-3 text-sm leading-6 text-muted">A single starting point for student connections, alumni guidance, everyday essentials and campus information.</p>
          <div className="my-5 space-y-4">
            <div className="flex gap-3"><span className="feature-check">✓</span><div><p className="text-sm font-bold">Find your people</p><p className="mt-0.5 text-xs leading-5 text-muted">Discover students by programme, year and skills.</p></div></div>
            <div className="flex gap-3"><span className="feature-check feature-check-pink">✓</span><div><p className="text-sm font-bold">Learn beyond lectures</p><p className="mt-0.5 text-xs leading-5 text-muted">Explore alumni profiles and mentoring connections.</p></div></div>
            <div className="flex gap-3"><span className="feature-check feature-check-amber">✓</span><div><p className="text-sm font-bold">Make student life easier</p><p className="mt-0.5 text-xs leading-5 text-muted">Browse essentials and campus resources in one place.</p></div></div>
          </div>
          <Link href="/campus" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#102544] px-4 text-sm font-bold text-white transition hover:bg-[#1c3c68]">Explore campus info <span className="ml-2" aria-hidden="true">→</span></Link>
        </aside>
      </section>

      <section aria-labelledby="community-picks">
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="home-eyebrow">MEET THE COMMUNITY</p><h2 id="community-picks" className="mt-1 font-display text-2xl font-bold tracking-tight">People to discover</h2><p className="mt-1 text-sm text-muted">A sample of the student community across different interests.</p></div><Link href="/discover" className="shrink-0 text-sm font-bold text-brand-blue-text hover:underline">Discover people <span aria-hidden="true">→</span></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {people.map((person, index) => (
            <Link key={person.id} href={`/people/${person.id}`} className="person-spotlight group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-blue/50 hover:shadow-soft">
              <Avatar name={person.name} ring={ringKeyForStanding(standingFor(person))} size="lg" />
              <span className="min-w-0 flex-1"><span className="block truncate font-display font-bold">{person.name}</span><span className="mt-0.5 block truncate text-xs text-muted">{person.programme}</span><span className="mt-2 inline-flex items-center rounded-full bg-canvas px-2.5 py-1 text-[10px] font-bold text-muted">{person.skills[0] ?? 'Student'}</span></span>
              <span className="text-lg text-muted transition group-hover:translate-x-1 group-hover:text-brand-blue-text" aria-hidden="true">→</span>
              {index === 0 ? <span className="sr-only">Featured sample profile</span> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d8e8f8] bg-gradient-to-r from-[#eaf4ff] via-white to-[#fff9c9] p-5 sm:p-7">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><p className="home-eyebrow">YOUR NEXT STEP</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Make your campus feel smaller.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Start with a person, a useful find, or a campus resource. The best of university life often begins with one connection.</p></div><div className="flex shrink-0 flex-wrap gap-2"><ButtonLink href="/discover">Meet students</ButtonLink><ButtonLink href="/alumni" variant="secondary">Explore alumni</ButtonLink></div></div>
      </section>
    </div>
  );
}
