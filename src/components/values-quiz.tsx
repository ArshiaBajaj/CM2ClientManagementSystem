"use client";

import { useState } from "react";

type Pair = { a: { index: number; statement: string }; b: { index: number; statement: string } };

export function ValuesQuiz({ pairs }: { pairs: Pair[] }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const step = answers.length;
  const done = step >= pairs.length;
  // Stepping by 7 (coprime with 25) spreads each value out so it rarely appears twice in a row.
  const order = pairs.map((_, k) => (k * 7) % pairs.length);
  const pair = pairs[order[Math.min(step, pairs.length - 1)]];

  const choose = (index: number) => setAnswers((prev) => [...prev, index]);

  return (
    <form action="/api/values" method="post" className="panel mt-6 max-w-2xl rounded-xl p-6">
      {answers.map((value, i) => (
        <input key={i} type="hidden" name={`pair_${order[i]}`} value={value} />
      ))}
      <div className="flex items-center justify-between text-xs text-ink/50">
        <span>
          {done ? "All done" : `Question ${step + 1} of ${pairs.length}`}
        </span>
        {step > 0 ? (
          <button type="button" onClick={() => setAnswers((prev) => prev.slice(0, -1))} className="hover:text-ink">
            ← Back
          </button>
        ) : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(step / pairs.length) * 100}%` }} />
      </div>

      {done ? (
        <div className="mt-8 text-center">
          <p className="font-display text-2xl font-semibold tracking-tight">Ready to see your values?</p>
          <label className="mx-auto mt-5 flex max-w-md items-start gap-2 text-left text-sm text-ink/70">
            <input type="checkbox" name="sharePeers" value="1" className="mt-1" />
            Count me (anonymously) when other Coach Me 2 students look for peers with similar values.
            No one sees your name.
          </label>
          <button className="btn mt-6">See my results</button>
        </div>
      ) : (
        <div className="mt-8">
          <p className="text-center font-display text-xl font-semibold tracking-tight">
            Which matters more to you right now?
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[pair.a, pair.b].map((option) => (
              <button
                key={option.index}
                type="button"
                onClick={() => choose(option.index)}
                className="rounded-xl border-2 border-ink/10 bg-white p-6 text-left text-lg font-medium transition hover:-translate-y-0.5 hover:border-accent hover:shadow-soft"
              >
                {option.statement}
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-ink/45">Go with your first instinct. There are no wrong answers.</p>
        </div>
      )}
    </form>
  );
}
