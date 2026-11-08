import Link from "next/link";
import { siteAsset } from "@/lib/site-assets";
import { LINKS, type Person } from "@/content/site";

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
    <section className="hero-glow border-b border-ink/[0.06]">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 pb-14 pt-16 sm:pt-24 md:grid-cols-[1fr_auto]">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">{title}</h1>
          {children ? <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink/70">{children}</div> : null}
        </div>
        {src ? (
          <div className="relative mx-auto hidden md:block">
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-accent/20 to-leaf/20 blur-2xl" aria-hidden />
            <img src={src} alt="" className="relative h-56 w-56" />
          </div>
        ) : null}
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
}: {
  title?: string;
  eyebrow?: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-6xl px-6 py-14 ${className}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2> : null}
      {intro ? <p className="mt-3 max-w-2xl text-ink/65">{intro}</p> : null}
      <div className={title || intro ? "mt-8" : ""}>{children}</div>
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
    <article className="panel lift flex flex-col rounded-2xl p-6">
      {tag ? <p className="label-caps text-accent">{tag}</p> : null}
      <h3 className={`font-display text-xl font-semibold tracking-tight ${tag ? "mt-2" : ""}`}>{title}</h3>
      <div className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">{children}</div>
      {href && cta ? <SmartLink href={href} external={external} className="link-accent mt-4 text-sm">{cta} ›</SmartLink> : null}
    </article>
  );
}

/** Internal links use Next's router; anything starting with http opens in a new tab. */
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
    return (
      <a href={href} className={className} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
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
  cta = "Schedule a call",
  secondary,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 text-paper shadow-soft sm:px-12">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl"
          aria-hidden
        />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-leaf/30 blur-3xl" aria-hidden />
        <div className="relative">
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-xl text-lg text-paper/75">{body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <SmartLink href={href} className="btn bg-white text-navy hover:bg-paper">
              {cta}
            </SmartLink>
            {secondary ? (
              <SmartLink
                href={secondary.href}
                className="inline-flex items-center justify-center rounded-md border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
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
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => {
        const photo = siteAsset(person.photo);
        return (
          <li key={`${person.name}-${person.role}`} className="panel lift flex flex-col rounded-2xl p-5">
            <div className="flex items-center gap-4">
              {photo ? (
                <img
                  src={photo}
                  alt={person.name}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-full bg-mist object-cover ring-4 ring-white shadow-soft"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mist font-display text-lg font-semibold text-accent-deep">
                  {initials(person.name)}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold tracking-tight">{person.name}</h3>
                <p className="text-sm text-ink/60">{person.role}</p>
                {person.place ? <p className="text-xs text-ink/45">{person.place}</p> : null}
              </div>
            </div>
            <p className="mt-4 text-sm text-ink/70">{person.short}</p>
            <details className="group mt-3">
              <summary className="link-accent cursor-pointer list-none text-sm [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Meet {shortName(person.name)} ›</span>
                <span className="hidden group-open:inline">Close</span>
              </summary>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/70">
                {person.bio.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
                {person.website ? (
                  <a href={person.website} target="_blank" rel="noreferrer" className="link-accent">
                    {person.website.replace(/^https?:\/\/(www\.)?/, "")} ↗
                  </a>
                ) : null}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
