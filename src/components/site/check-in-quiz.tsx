"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { QUIZ_STEPS } from "@/content/site";

type Prompt = { text: string; art: string | null };

const NEXT_STEP: Record<string, { href: string; label: string }> = {
  "A coach in my corner": { href: "/scheduling", label: "Find your coach" },
  "A group of peers": { href: "/group-experiences", label: "See group coaching" },
  "Just tools and resources": { href: "/student-resources", label: "Open the resource library" },
  "Not sure yet": { href: "/teens", label: "Start with the teen page" },
};

/** "You deserve a coach if…" cards. Tapping one opens a 60-second check-in, then an optional sign-up. */
export function CheckInQuiz({ prompts }: { prompts: Prompt[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const step = answers.length;
  const done = step >= QUIZ_STEPS.length;
  const suggestion = NEXT_STEP[answers[1] ?? ""] ?? NEXT_STEP["Not sure yet"];

  function open(text: string) {
    setPrompt(text);
    setAnswers([]);
    setStatus("idle");
    dialog.current?.showModal();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    form.set("kind", "newsletter");
    form.set("topic", "Check-in quiz");
    form.set("details", JSON.stringify({ prompt, frequency: answers[0], wants: answers[1] }));
    try {
      const response = await fetch("/api/site/inquiries", { method: "POST", body: form, headers: { accept: "application/json" } });
      setStatus(response.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map((p, i) => (
          <li key={p.text}>
            <button
              type="button"
              onClick={() => open(p.text)}
              className="panel group flex h-full w-full flex-col rounded-xl p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-sm font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
                {p.art ? <img src={p.art} alt="" className="h-14 w-14" /> : null}
              </div>
              <span className="mt-3 flex-1 font-medium leading-snug">{p.text}</span>
              <span className="link-accent mt-4 text-sm">Start the quiz ›</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="w-[min(92vw,30rem)] rounded-2xl p-0 shadow-soft backdrop:bg-ink/40"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="relative p-6">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="absolute right-3 top-3 rounded-md px-2 py-1 text-xl leading-none text-ink/50 hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
          <p className="label-caps text-accent">{done ? "Last step" : "A 60-second check-in"}</p>
          {!done ? (
            <>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{QUIZ_STEPS[step].question}</h2>
              <p className="mt-2 text-sm text-ink/60">{prompt}</p>
              <div className="mt-5 grid gap-2">
                {QUIZ_STEPS[step].options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswers([...answers, option])}
                    className="btn-secondary justify-start text-left"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          ) : status === "sent" ? (
            <>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">You&apos;re on the list.</h2>
              <p className="mt-2 text-sm text-ink/65">We&apos;ll send program dates and resources. Here&apos;s a good next step for you:</p>
              <Link href={suggestion.href} className="btn mt-5" onClick={() => dialog.current?.close()}>
                {suggestion.label}
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Want this in your inbox?</h2>
              <p className="mt-2 text-sm text-ink/65">
                First name and email. We&apos;ll send program dates, resources, and nothing creepy.
              </p>
              <form onSubmit={submit} className="mt-4 space-y-3">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <label className="block text-sm font-medium">
                  First name
                  <input name="name" required autoComplete="given-name" className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Email
                  <input type="email" name="email" required autoComplete="email" className="field" />
                </label>
                {status === "error" ? (
                  <p role="alert" className="text-sm text-signal">
                    That didn&apos;t go through. Check your email address and try again.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button className="btn" disabled={status === "sending"}>
                    {status === "sending" ? "Joining…" : "Join the list"}
                  </button>
                  <Link href={suggestion.href} className="link-accent text-sm" onClick={() => dialog.current?.close()}>
                    Skip — {suggestion.label.toLowerCase()}
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
