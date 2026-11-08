"use client";

import { useEffect, useState } from "react";

type State = "checking" | "unsupported" | "needs-home-screen" | "blocked" | "off" | "on" | "working";

function urlBase64ToUint8Array(base64: string) {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Turns phone (and Apple Watch) notifications on or off for this device. */
export function NotificationSetup() {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(ios && !standalone ? "needs-home-screen" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setState(existing ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setState("working");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const { publicKey } = (await (await fetch("/api/push")).json()) as { publicKey: string };
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "subscribe", subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error("save failed");
      setState("on");
      setMessage("Notifications are on for this device.");
    } catch {
      setState("off");
      setMessage("That didn't work. Try again, or check notification settings for this site.");
    }
  }

  async function turnOff() {
    setState("working");
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "unsubscribe", subscription: subscription.toJSON() }),
      });
      await subscription.unsubscribe();
    }
    setState("off");
    setMessage("Notifications are off for this device.");
  }

  async function test() {
    await fetch("/api/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    });
    setMessage("Test sent. It should arrive in a few seconds.");
  }

  return (
    <div>
      {state === "checking" ? <p className="text-sm text-ink/55">Checking this device…</p> : null}
      {state === "needs-home-screen" ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/75">
          <li>
            In Safari, tap the <span className="font-semibold">Share</span> button.
          </li>
          <li>
            Tap <span className="font-semibold">Add to Home Screen</span>, then <span className="font-semibold">Add</span>.
          </li>
          <li>Open Coach Me 2 from your Home Screen, come back to this page, and turn notifications on.</li>
        </ol>
      ) : null}
      {state === "unsupported" ? (
        <p className="text-sm text-ink/65">This browser can&apos;t receive notifications. Try Safari on iPhone, or Chrome.</p>
      ) : null}
      {state === "blocked" ? (
        <p className="text-sm text-ink/65">
          Notifications are blocked for this site. Allow them in your phone or browser settings, then reload this page.
        </p>
      ) : null}
      {state === "off" || state === "on" || state === "working" ? (
        <div className="flex flex-wrap items-center gap-3">
          {state === "on" ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf-soft px-3 py-1 text-sm font-semibold text-leaf">
                ● On for this device
              </span>
              <button type="button" onClick={test} className="btn-secondary">
                Send a test
              </button>
              <button type="button" onClick={turnOff} className="btn-ghost">
                Turn off
              </button>
            </>
          ) : (
            <button type="button" onClick={turnOn} disabled={state === "working"} className="btn">
              {state === "working" ? "Turning on…" : "Turn on notifications"}
            </button>
          )}
        </div>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 text-sm text-ink/65">
          {message}
        </p>
      ) : null}
    </div>
  );
}
