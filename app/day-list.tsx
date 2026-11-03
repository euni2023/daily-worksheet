"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { DaySummary } from "@/lib/content";
import { latestByDay } from "@/lib/storage";
import type { Submission } from "@/lib/types";

const noop = () => () => {};
const empty: Record<string, Submission> = {};

export default function DayList({ days }: { days: DaySummary[] }) {
  // localStorage는 브라우저에서만 읽는다 (서버 렌더링 때는 빈 기록)
  const done = useSyncExternalStore(noop, cachedLatest, () => empty);
  const today = days.find((d) => !done[d.id]) ?? days[days.length - 1];

  if (days.length === 0) return <p className="mt-8 text-muted">아직 학습지가 없어요.</p>;

  return (
    <>
      {today && (
        <Link
          href={`/day/${today.id}`}
          className="mt-6 block rounded-2xl bg-brand p-6 text-white shadow hover:opacity-95"
        >
          <div className="text-sm opacity-80">오늘의 학습지</div>
          <div className="mt-1 text-2xl font-bold">{today.title}</div>
          {today.subtitle && <div className="mt-1 opacity-80">{today.subtitle}</div>}
        </Link>
      )}

      <h2 className="mt-10 text-lg font-bold">전체 회차</h2>
      <ul className="mt-3 divide-y divide-black/10 rounded-xl bg-paper shadow-sm">
        {days.map((d) => {
          const s = done[d.id];
          return (
            <li key={d.id}>
              <Link href={`/day/${d.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-brand-soft/40">
                <span>{d.title}</span>
                <span className="text-sm text-muted">
                  {s ? `완료 · ${s.result.score}/${s.result.total}` : "아직 안 풂"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// useSyncExternalStore는 같은 값이면 같은 객체를 돌려줘야 한다
let cache: { raw: string | null; value: Record<string, Submission> } = { raw: null, value: empty };
function cachedLatest() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("dw:submissions");
  } catch {}
  if (raw !== cache.raw) cache = { raw, value: latestByDay() };
  return cache.value;
}
