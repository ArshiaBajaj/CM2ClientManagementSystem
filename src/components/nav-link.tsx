"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/workspace" && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
        active ? "bg-white/15 font-medium text-white" : "text-paper/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
