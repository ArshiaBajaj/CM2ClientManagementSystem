"use client";

import { useEffect, useRef, useState } from "react";

const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 60 * 1000;

/**
 * Signs people out after 30 minutes without activity, so a portal left open on a shared computer doesn't
 * stay open (a HIPAA "automatic logoff" safeguard). Shows a one-minute warning first.
 */
export function IdleSignOut() {
  const last = useRef(Date.now());
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    const touch = () => {
      last.current = Date.now();
      setWarning(false);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) {
        fetch("/api/auth/logout", { method: "POST" }).finally(() => {
          window.location.href = "/login?error=" + encodeURIComponent("Signed out after 30 minutes without activity");
        });
      } else if (idle >= IDLE_MS - WARN_MS) {
        setWarning(true);
      }
    }, 15_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, []);

  if (!warning) return null;
  return (
    <div role="alertdialog" aria-live="assertive" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl bg-navy p-4 text-paper shadow-soft">
      <p className="font-semibold">Still there?</p>
      <p className="mt-1 text-sm text-paper/80">For privacy, you&apos;ll be signed out in about a minute.</p>
      <button type="button" className="btn mt-3 bg-white text-navy hover:bg-paper" onClick={() => setWarning(false)}>
        Keep me signed in
      </button>
    </div>
  );
}
