"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A main-menu link that marks itself when you're on that page (or one of its sub-pages). */
export function NavHere({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const sections: Record<string, string[]> = {
    "/services": ["/services", "/group-experiences", "/content", "/decision-making", "/scheduling", "/teens"],
    "/parents": ["/parents"],
    "/about": ["/about", "/meet-our-coaches", "/team", "/innovators", "/podcast", "/research"],
    "/volunteer": ["/volunteer", "/donate", "/partners", "/contact"],
  };
  const here = (sections[href] ?? [href]).some((p) => path === p || path.startsWith(`${p}/`));
  return (
    <Link
      href={href}
      aria-current={here ? "page" : undefined}
      className={`relative py-1 text-[15px] font-medium transition ${
        here ? "text-ink after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-accent" : "text-ink/70 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
