"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrintBar from "@/components/print-bar";
import { SimpleTable } from "@/components/worksheet";
import { answerRows } from "@/lib/answers";
import { subKey } from "@/lib/keys";
import { latestByDay } from "@/lib/storage";
import type { Day, Submission } from "@/lib/types";

export default function AnswerSheet({ dayId }: { dayId: string }) {
  const [day, setDay] = useState<Day | null>(null);
  const [sub, setSub] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/parent/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayId }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setDay(d);
        setSub(latestByDay()[dayId] ?? null);
      })
      .catch((e) => setError(e.message));
  }, [dayId]);

  if (error) return <p className="p-8 text-center text-red-700">{error}</p>;
  if (!day) return <p className="p-8 text-center text-muted">불러오는 중...</p>;

  const guide = day.parentGuide;
  const table = guide?.answerTable ?? { header: ["번호", "정답", "해설·채점 포인트"], rows: answerRows(day) };

  return (
    <div className="py-6">
      <div className="no-print mx-auto mb-2 max-w-3xl px-4 sm:px-0">
        <Link href="/parent" className="text-sm text-muted hover:text-brand">
          ← 엄마 화면
        </Link>
      </div>
      <PrintBar note="정답 페이지예요. 학생용 학습지와 따로 인쇄하세요." />

      <article className="sheet mx-auto max-w-3xl bg-paper px-5 py-6 shadow-sm sm:rounded-2xl sm:px-8">
        <h1 className="text-xl font-bold text-brand sm:text-2xl">{day.title.replace(/^(Day \d+).*/, "$1")} 정답과 채점 안내 (엄마용)</h1>
        <p className="mt-1 text-sm text-muted">{day.title}</p>
        {guide?.note && <p className="mt-3 text-sm">{guide.note}</p>}

        <div className="mt-5">
          <SimpleTable header={table.header} rows={table.rows} />
        </div>

        {guide?.tables?.map((t, i) => (
          <div key={i} className="avoid-break mt-6">
            {t.title && <h2 className="mb-2 font-bold">{t.title}</h2>}
            <SimpleTable header={t.header} rows={t.rows} />
          </div>
        ))}

        {guide?.boxes?.map((b, i) => (
          <div key={i} className="avoid-break mt-6 rounded-lg border border-black/15 px-4 py-3">
            {b.title && <p className="font-bold">{b.title}</p>}
            <ul className="mt-1 space-y-1">
              {b.lines.map((l, j) => (
                <li key={j}>· {l}</li>
              ))}
            </ul>
          </div>
        ))}
      </article>

      {sub ? <SubmissionView day={day} sub={sub} /> : (
        <p className="no-print mx-auto mt-6 max-w-3xl px-4 text-muted sm:px-0">이 기기에는 아직 제출 기록이 없어요.</p>
      )}
    </div>
  );
}

function SubmissionView({ day, sub }: { day: Day; sub: Submission }) {
  const r = sub.result;
  const extras = day.sections.flatMap((s) =>
    s.blocks.filter((b) => b.kind === "question" && (b.type === "phonics" || b.type === "survey")),
  );
  return (
    <section className="no-print mx-auto mt-8 max-w-3xl rounded-2xl bg-paper px-5 py-6 shadow-sm sm:px-8">
      <h2 className="text-lg font-bold">
        최근 제출 · {new Date(sub.submittedAt).toLocaleString("ko-KR")} · {sub.mode === "photo" ? "종이 사진" : "화면"}
      </h2>
      <p className="mt-1">
        점수 <b>{r.score}/{r.total}</b> {r.aiUsed ? "(AI 채점 포함)" : "(자동 채점만, 서술형은 직접 확인)"}
      </p>
      <p className="mt-3 rounded-lg bg-brand-soft px-4 py-3 text-[15px]">학생이 받은 피드백: {r.feedback}</p>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-black/5 text-left">
            <th className="px-2 py-1.5">번호</th>
            <th className="px-2 py-1.5">학생 답</th>
            <th className="px-2 py-1.5">결과</th>
            <th className="px-2 py-1.5">메모</th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((it) => (
            <tr key={it.key} className="border-t border-black/10">
              <td className="whitespace-nowrap px-2 py-1.5">{it.label}</td>
              <td className="px-2 py-1.5">{it.given || <span className="text-muted">(비어 있음)</span>}</td>
              <td
                className={`whitespace-nowrap px-2 py-1.5 font-bold ${it.correct === true ? "text-green-700" : it.correct === false ? "text-orange-700" : "text-muted"}`}
              >
                {it.correct === true ? "○" : it.correct === false ? "×" : "확인 필요"}
              </td>
              <td className="px-2 py-1.5 text-muted">{it.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sub.answers &&
        extras.map((b) =>
          b.kind === "question" && b.type === "phonics" ? (
            <div key={b.id} className="mt-6">
              <h3 className="font-bold">파닉스 소리 내어 읽기 ({b.label})</h3>
              <SimpleTable
                rows={b.rows.map((row, i) => [
                  row.label,
                  ...row.words.map((w, j) => `${w} ${(sub.answers![subKey(b.id, i, j)] as string) ?? "-"}`),
                ])}
              />
            </div>
          ) : b.kind === "question" && b.type === "survey" ? (
            <div key={b.id} className="mt-6">
              <h3 className="font-bold">학생이 쓴 자기평가·관심사</h3>
              <ul className="mt-1 space-y-1">
                {b.items.map((it, i) => (
                  <li key={i}>
                    · {it.text} <b>{(sub.answers![subKey(b.id, i)] as string) ?? "-"}</b>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
    </section>
  );
}
