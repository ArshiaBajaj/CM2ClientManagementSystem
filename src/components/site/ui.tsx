import Link from "next/link";
import { siteAsset } from "@/lib/site-assets";
import { LINKS, type Person } from "@/content/site";

/** Fine globe lines used as a quiet motif (the "Warm Meridian" mark). Decorative only. */
export function Meridians({ className = "" }: { className?: string }) {
  const meridians = [0.15, 0.35, 0.55, 0.75, 0.92];
  const parallels = [-0.66, -0.33, 0, 0.33, 0.66];
  return (
    <svg viewBox="-110 -110 220 220" className={className} aria-hidden="true" fill="none">
      <circle r="100" stroke="currentColor" strokeOpacity=".55" />
      {meridians.map((m) => (
        <ellipse key={m} rx={100 * m} ry="100" stroke="currentColor" strokeOpacity=".22" />
      ))}
      <line x1="0" y1="-100" x2="0" y2="100" stroke="currentColor" strokeOpacity=".35" />
      {parallels.map((p) => {
        const half = 100 * Math.sqrt(1 - p * p);
        return <line key={p} x1={-half} y1={p * 100} x2={half} y2={p * 100} stroke="currentColor" strokeOpacity=".22" />;
      })}
      <path d="M-62 38 Q -5 -62 55 -46" stroke="#c2643b" strokeWidth="1.6" />
      <circle cx="-62" cy="38" r="4" fill="#2f6fb0" />
      <circle cx="55" cy="-46" r="4" fill="#4a7a2e" />
    </svg>
  );
}

export function PageHero({
  eyebrow,
  title,
  children,
  art,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  art?: string;
}) {
  const src = siteAsset(art);
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto grid max-w-6xl items-end gap-10 px-6 pb-14 pt-16 sm:pt-24 md:grid-cols-[1fr_auto]">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-6 font-display text-5xl leading-[1.02] sm:text-7xl">{title}</h1>
          {children ? <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-ink/75">{children}</div> : null}
        </div>
        {src ? <img src={src} alt="" className="mx-auto hidden h-44 w-44 md:block" /> : null}
      </div>
    </section>
  );
}

export function Section({
  title,
  eyebrow,
  intro,
  children,
  className = "",
  id,
}: {
  title?: string;
  eyebrow?: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl scroll-mt-28 px-6 py-16 ${className}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">{title}</h2> : null}
      {intro ? <p className="mt-4 max-w-2xl text-lg text-ink/70">{intro}</p> : null}
      <div className={title || intro ? "mt-10" : ""}>{children}</div>
    </section>
  );
}

export function Card({
  title,
  children,
  href,
  cta,
  tag,
  external,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  cta?: string;
  tag?: string;
  external?: boolean;
}) {
  return (
    <article className="panel lift flex flex-col rounded-2xl p-7">
      {tag ? <p className="label-caps text-accent-deep">{tag}</p> : null}
      <h3 className={`font-display text-2xl leading-snug ${tag ? "mt-3" : ""}`}>{title}</h3>
      <div className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/75">{children}</div>
      {href && cta ? (
        <SmartLink href={href} external={external} className="link-accent mt-5 text-sm">
          {cta}
        </SmartLink>
      ) : null}
    </article>
  );
}

/** Internal links use Next's router; anything starting with http opens in a new tab and says so to screen readers. */
export function SmartLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  if (external || href.startsWith("http") || href.startsWith("mailto:")) {
    const newTab = href.startsWith("http");
    return (
      <a href={href} className={className} {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
        {newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function CtaBand({
  title,
  body,
  href = LINKS.discoveryCall,
  cta = "Book a 20-minute call",
  secondary,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-14 text-paper sm:px-14">
        <Meridians className="pointer-events-none absolute -right-16 -top-10 hidden h-80 w-80 text-paper md:block" />
        <div className="relative max-w-2xl">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 text-lg text-paper/80">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SmartLink href={href} className="btn bg-paper text-ink hover:bg-surface">
              {cta}
            </SmartLink>
            {secondary ? (
              <SmartLink
                href={secondary.href}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-paper/40 px-5 py-2.5 text-sm font-semibold text-paper hover:border-paper"
              >
                {secondary.label}
              </SmartLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function shortName(name: string) {
  const parts = name.split(/\s+/);
  return parts[0] === "Dr." ? parts.slice(0, 2).join(" ") : parts[0];
}

function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** People cards. The full bio opens in place, so nothing needs JavaScript. */
export function PeopleGrid({ people }: { people: Person[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => {
        const photo = siteAsset(person.photo);
        return (
          <li key={`${person.name}-${person.role}`} className="flex flex-col">
            {photo ? (
              <img
                src={photo}
                alt={`Portrait of ${person.name}`}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-2xl bg-mist object-cover"
              />
            ) : (
              <span
                className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-mist font-display text-6xl text-accent-deep"
                aria-hidden
              >
                {initials(person.name)}
              </span>
            )}
            <h3 className="mt-5 font-display text-2xl">{person.name}</h3>
            <p className="mt-1 text-sm font-medium text-ink/70">
              {person.role}
              {person.place ? ` · ${person.place}` : ""}
            </p>
            <p className="mt-3 text-[15px] text-ink/75">{person.short}</p>
            <details className="group mt-3">
              <summary className="link-accent cursor-pointer list-none text-sm [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Read {shortName(person.name)}&apos;s story</span>
                <span className="hidden group-open:inline">Close</span>
              </summary>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/75">
                {person.bio.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
                {person.website ? (
                  <SmartLink href={person.website} className="link-accent">
                    {person.website.replace(/^https?:\/\/(www\.)?/, "")}
                  </SmartLink>
                ) : null}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
