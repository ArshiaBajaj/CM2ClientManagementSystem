"use client";

import { useEffect, useState } from "react";
import { deviceAlertState, subscribeThisDevice, type State } from "@/components/notification-setup";

const SNOOZE_KEY = "cm2_alerts_snoozed_until";

/**
 * Shown at the top of every page until this phone or computer has notifications on. Phones only allow a site to
 * send notifications after the person taps Allow once, so this makes that one tap the obvious next thing to do.
 */
export function AlertsBanner() {
  const [state, setState] = useState<State | "hidden">("hidden");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let snoozed = false;
    try {
      snoozed = Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
    } catch {
      snoozed = false;
    }
    if (snoozed) return;
    deviceAlertState()
      .then((s) => setState(s === "off" || s === "needs-home-screen" ? s : "hidden"))
      .catch(() => setState("hidden"));
  }, []);

  function later() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 3 * 86_400_000));
    } catch {
      // Private browsing: it just shows again next time.
    }
    setState("hidden");
  }

  async function turnOn() {
    setBusy(true);
    const result = await subscribeThisDevice();
    setBusy(false);
    if (result === "on") {
      setNote("You're all set. Reminders will show on this device.");
      setTimeout(() => setState("hidden"), 2500);
    } else if (result === "blocked") {
      setNote("Notifications are blocked. Allow them for this site in your phone or browser settings.");
    } else {
      setNote("That didn't work. Try again from Phone & Apple Watch.");
    }
  }

  if (state === "hidden") return null;
  return (
    <section
      aria-label="Turn on reminders"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-sm">
        <p className="font-semibold text-ink">🔔 Get reminders on your phone</p>
        {state === "needs-home-screen" ? (
          <p className="mt-1 text-ink/70">
            iPhone: tap <span className="font-semibold">Share</span> → <span className="font-semibold">Add to Home Screen</span>,
            then open Coach Me 2 from your Home Screen and tap Turn on.
          </p>
        ) : (
          <p className="mt-1 text-ink/70">Sessions, messages, and anything due. They also show on Apple Watch.</p>
        )}
        {note ? (
          <p role="status" className="mt-1 font-medium text-ink">
            {note}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {state === "off" ? (
          <button type="button" onClick={turnOn} disabled={busy} className="btn px-4 py-2 text-sm">
            {busy ? "Turning on…" : "Turn on"}
          </button>
        ) : null}
        <button type="button" onClick={later} className="btn-ghost px-3 py-2 text-sm">
          Later
        </button>
      </div>
    </section>
  );
}
