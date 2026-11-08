import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/public-shell";
import { httpsUrl } from "@/lib/public-url";

const KIND_LABELS: Record<string, string> = {
  podcast: "Podcast",
  research: "Research",
  news: "Program news",
};

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect(await homeFor(user));

  const updates = await prisma.programUpdate.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 6,
  });
  const onboardingUrl = httpsUrl(process.env.ONBOARDING_APP_URL);

  return (
    <PublicShell>
      <section className="bg-ink px-6 py-8 text-white sm:py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Everyone deserves a coach.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            One-on-one coaching that helps teens figure out what matters to them and act on it.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-6 grid max-w-6xl gap-4 px-6 sm:mt-8 md:grid-cols-3">
        {[
          {
            title: "Get a coach",
            body: "Tell us what you'd like help with and when you're free. We'll suggest coaches who fit.",
            href: "/get-a-coach",
            cta: "Request a coach",
            external: false,
          },
          {
            title: "I already have a coach",
            body: "Sign in to see appointments, chat with your coach, and track your goals.",
            href: "/login",
            cta: "Go to my portal",
            external: false,
          },
          {
            title: "Become a coach",
            body: onboardingUrl
              ? "Apply and clear onboarding. Once you're activated, sign in here and finish your coach forms before students open."
              : "Applications open on a separate site when the program publishes one. After a manager activates you, sign in here and finish your coach forms. Students stay closed until those forms are signed.",
            href: onboardingUrl ?? "/login",
            cta: onboardingUrl ? "Start coach onboarding" : "Sign in after activation",
            external: Boolean(onboardingUrl),
          },
        ].map((card) => (
          <article key={card.title} className="panel flex flex-col rounded-xl p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">{card.title}</h2>
            <p className="mt-2 flex-1 text-sm text-ink/60">{card.body}</p>
            {card.external ? (
              <a href={card.href} className="btn-secondary mt-5">
                {card.cta}
              </a>
            ) : (
              <Link href={card.href} className={card.href === "/get-a-coach" ? "btn mt-5" : "btn-secondary mt-5"}>
                {card.cta}
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Podcast and research</h2>
        <p className="mt-2 text-ink/60">The latest episodes and findings from our coaches and research interns.</p>
        {updates.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">New episodes and research summaries will appear here.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {updates.map((u) => (
              <article key={u.id} className="panel flex flex-col rounded-xl p-5">
                <p className="label-caps text-accent">{KIND_LABELS[u.kind] ?? u.kind}</p>
                <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">{u.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink/60">{u.summary}</p>
                <p className="mt-3 text-xs text-ink/45">{u.publishedAt.toLocaleDateString()}</p>
                {u.url ? (
                  <a href={u.url} target="_blank" rel="noreferrer" className="link-accent mt-2 text-sm">
                    {u.kind === "podcast" ? "Listen" : "Read more"}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  );
}
