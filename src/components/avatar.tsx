export function Avatar({
  url,
  initials,
  size = "md",
}: {
  url: string | null;
  initials: string;
  size?: "sm" | "md" | "lg";
}) {
  const cls = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`${cls} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${cls} grid shrink-0 place-items-center rounded-full bg-[#1a3350] font-semibold text-paper`}>
      {initials}
    </div>
  );
}
