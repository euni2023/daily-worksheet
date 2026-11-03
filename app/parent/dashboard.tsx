"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout } from "@/components/parent-gate";
import type { DaySummary } from "@/lib/content";
import { getSubmissions } from "@/lib/storage";
import { AREA_LABEL, type Area, type Submission } from "@/lib/types";

const AREAS: Area[] = ["vocab", "reading", "writing", "english", "wrapup"];

type Summary = { overview: string; wrong: string[]; weakAreas: string[]; nextSteps: string[] };

export default function Dashboard({ days }: { days: DaySummary[] }) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage는 마운트 뒤에만 읽을 수 있다
  useEffect(() => setSubs(getSubmissions()), []);

  const latest = new Map<string, Submission>();
  const count = new Map<string, number>();
  for (const s of subs) {
    count.set(s.dayId, (count.get(s.dayId) ?? 0) + 1);
    const prev = latest.get(s.dayId);
    if (!prev || prev.submittedAt < s.submittedAt) latest.set(s.dayId, s);
  }
  const doneCount = days.filter((d) => latest.has(d.id)).length;

  async function makeSummary() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/parent/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissions: [...latest.values()] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요약하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">엄마 화면</h1>
        <button onClick={logout} className="text-sm text-muted hover:text-brand">
          잠그기
        </button>
      </div>
      <p className="mt-1 text-muted">
        전체 {days.length}회 중 {doneCount}회 완료. 기록은 이 기기의 브라우저에 저장돼 있어요.
      </p>

      <h2 className="mt-8 text-lg font-bold">진도표</h2>
      <div className="mt-3 overflow-x-auto rounded-xl bg-paper shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-brand-soft text-left">
              <th className="px-3 py-2">회차</th>
              <th className="px-3 py-2">제출일</th>
              <th className="px-3 py-2">점수</th>
              {AREAS.map((a) => (
                <th key={a} className="px-3 py-2 text-center">
                  {AREA_LABEL[a]}
                </th>
              ))}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const s = latest.get(d.id);
              return (
                <tr key={d.id} className="border-t border-black/10">
                  <td className="px-3 py-2">{d.title}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    {s ? `${s.submittedAt.slice(5, 10).replace("-", "/")} ${s.mode === "photo" ? "사진" : "화면"}` : "-"}
                    {(count.get(d.id) ?? 0) > 1 && <span className="ml-1">({count.get(d.id)}번)</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-bold">{s ? `${s.result.score}/${s.result.total}` : "-"}</td>
                  {AREAS.map((a) => {
                    const v = s?.result.byArea[a];
                    const weak = v && v.total > 0 && v.score / v.total < 0.6;
                    return (
                      <td key={a} className={`px-3 py-2 text-center ${weak ? "font-bold text-orange-700" : ""}`}>
                        {v ? `${v.score}/${v.total}` : "-"}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/parent/day/${d.id}`} className="text-brand hover:underline">
                      정답·해설
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">주황색 = 60% 미만 영역</p>

      <h2 className="mt-10 text-lg font-bold">AI 요약</h2>
      <p className="mt-1 text-sm text-muted">틀린 문제, 약한 영역, 다음에 할 일을 정리해 줘요.</p>
      <button
        onClick={makeSummary}
        disabled={busy || latest.size === 0}
        className="mt-3 rounded-lg bg-brand px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        {busy ? "정리하는 중..." : "지금까지 기록 요약하기"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {summary && (
        <div className="mt-4 space-y-4 rounded-xl bg-paper p-5 shadow-sm">
          <p className="leading-relaxed">{summary.overview}</p>
          <SummaryList title="틀린 문제" items={summary.wrong} />
          <SummaryList title="약한 영역" items={summary.weakAreas} />
          <SummaryList title="다음에 할 일" items={summary.nextSteps} />
        </div>
      )}
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="font-bold text-brand">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
