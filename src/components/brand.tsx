export function Wordmark({
  product,
  tone = "light",
}: {
  product?: string;
  tone?: "light" | "dark";
}) {
  const onDark = tone === "dark";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={onDark ? "inline-flex max-w-full rounded-md bg-white px-2 py-1.5" : "inline-flex max-w-full"}>
        {/* Original file, not a recompressed stand-in. */}
        <img
          src="/brand/coachme2-logo.png"
          alt="CoachMe2.world. Everyone deserves a coach."
          width={1024}
          height={221}
          className="h-9 w-auto max-w-full"
        />
      </span>
      {product ? (
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            onDark ? "text-paper/70" : "text-ink/45"
          }`}
        >
          {product}
        </p>
      ) : null}
    </div>
  );
}
