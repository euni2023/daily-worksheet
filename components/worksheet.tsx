"use client";

import type { ReactNode } from "react";
import type { AnswerValue, Answers, Block, Day, Question, Section } from "@/lib/types";
import { subKey } from "@/lib/keys";
import Rich from "./rich";

// solve: 화면에서 풀기 / print: 종이에 인쇄할 빈 학습지
export type Mode = "solve" | "print";

type Ctx = {
  mode: Mode;
  answers: Answers;
  set: (key: string, value: AnswerValue) => void;
  marks?: Record<string, boolean | null>;
  locked: boolean;
};

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

export default function Worksheet({
  day,
  mode,
  answers = {},
  onChange,
  marks,
  locked = false,
}: {
  day: Day;
  mode: Mode;
  answers?: Answers;
  onChange?: (key: string, value: AnswerValue) => void;
  marks?: Record<string, boolean | null>;
  locked?: boolean;
}) {
  const ctx: Ctx = { mode, answers, set: onChange ?? (() => {}), marks, locked };
  return (
    <article className="sheet mx-auto max-w-3xl bg-paper px-5 py-6 shadow-sm sm:rounded-2xl sm:px-8">
      <header className="avoid-break rounded-lg bg-brand px-5 py-4 text-white">
        <h1 className="text-xl font-bold sm:text-2xl">{day.title}</h1>
        {day.subtitle && <p className="mt-1 text-sm opacity-85">{day.subtitle}</p>}
      </header>
      {mode === "print" && (
        <p className="mt-3 text-sm">
          이름: ____________ &nbsp;&nbsp; 날짜: ____월 ____일 &nbsp;&nbsp; 걸린 시간: ______분
        </p>
      )}

      {day.intro && (
        <div className="avoid-break mt-4 rounded-lg border border-black/15 px-4 py-3 text-[15px] leading-relaxed">
          {day.intro.map((line, i) => (
            <p key={i}>
              <Rich text={line} />
            </p>
          ))}
        </div>
      )}

      {day.showChecklist && <Checklist day={day} ctx={ctx} />}

      {day.sections.map((s) => (
        <SectionView key={s.id} section={s} ctx={ctx} />
      ))}
    </article>
  );
}

function Checklist({ day, ctx }: { day: Day; ctx: Ctx }) {
  return (
    <table className="avoid-break mt-4 w-full border-collapse text-center text-sm">
      <tbody>
        <tr>
          <th className="border border-black/20 bg-brand-soft px-2 py-1.5">오늘 할 일</th>
          {day.sections.map((s) => (
            <td key={s.id} className="border border-black/20 px-2 py-1.5">
              {s.checklistLabel ?? s.title}
            </td>
          ))}
        </tr>
        <tr>
          <th className="border border-black/20 bg-brand-soft px-2 py-1.5">다 하면 ○ 표시</th>
          {day.sections.map((s) => (
            <td key={s.id} className="h-8 border border-black/20 font-bold text-brand">
              {ctx.mode === "solve" && sectionDone(s, ctx.answers) ? "○" : ""}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function sectionDone(s: Section, answers: Answers) {
  const qs = s.blocks.filter((b) => b.kind === "question" && b.type !== "survey" && b.type !== "phonics");
  return qs.length > 0 && qs.every((b) => Object.keys(answers).some((k) => k === b.id || k.startsWith(`${b.id}.`)));
}

function SectionView({ section, ctx }: { section: Section; ctx: Ctx }) {
  const [first, ...rest] = section.blocks;
  // 인쇄할 때 제목이 페이지 끝에 혼자 남지 않도록 첫 블록과 묶는다
  return (
    <section className="mt-8">
      <div className="avoid-break">
        <h2 className="flex items-baseline justify-between border-b-2 border-brand pb-1 text-lg font-bold text-brand">
          <span>{section.title}</span>
          {section.time && <span className="text-sm font-normal text-muted">{section.time}</span>}
        </h2>
        {first && (
          <div className="mt-3">
            <BlockView block={first} ctx={ctx} />
          </div>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {rest.map((b, i) => (
          <BlockView key={i} block={b} ctx={ctx} />
        ))}
      </div>
    </section>
  );
}

function BlockView({ block, ctx }: { block: Block; ctx: Ctx }) {
  switch (block.kind) {
    case "text":
      return (
        <p className="whitespace-pre-wrap leading-relaxed">
          <Rich text={block.text} />
        </p>
      );
    case "heading":
      return (
        <h3 className="avoid-break break-after-avoid-page pt-2 font-bold text-brand">
          {block.text}
          {block.note && <span className="ml-2 font-normal text-foreground">{block.note}</span>}
        </h3>
      );
    case "box":
      return (
        <div
          className={`avoid-break rounded-lg px-4 py-3 leading-relaxed ${block.tone === "blue" ? "bg-brand-soft" : "bg-black/5"}`}
        >
          {block.lines.map((l, i) => (
            <p key={i}>
              <Rich text={l} />
            </p>
          ))}
        </div>
      );
    case "passage":
      return (
        <div className="avoid-break rounded-lg bg-black/5 px-5 py-4 text-[16px] leading-[1.9]">
          {block.title && <p className="mb-1 text-center font-bold">{block.title}</p>}
          {block.paragraphs.map((p, i) => (
            <p key={i} className="indent-3">
              {p}
            </p>
          ))}
        </div>
      );
    case "table":
      return <SimpleTable header={block.header} rows={block.rows} />;
    case "practice":
      return (
        <table className="avoid-break w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-brand-soft">
              <th className="border border-black/20 px-2 py-1.5">단어</th>
              <th className="border border-black/20 px-2 py-1.5">뜻</th>
              <th className="border border-black/20 px-2 py-1.5">두 번 따라 쓰기</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r) => (
              <tr key={r.word}>
                <td className="border border-black/20 px-2 py-1.5 font-bold">{r.word}</td>
                <td className="border border-black/20 px-2 py-1.5">{r.meaning}</td>
                <td className="border border-black/20 px-2 py-1.5">
                  {ctx.mode === "print" ? (
                    <span className="block h-6" />
                  ) : (
                    <div className="flex gap-2">
                      {[0, 1].map((n) => {
                        const k = subKey(`p-${r.word}`, n);
                        return (
                          <input
                            key={n}
                            aria-label={`${r.word} 따라 쓰기 ${n + 1}`}
                            className={inputCls("w-full")}
                            value={(ctx.answers[k] as string) ?? ""}
                            disabled={ctx.locked}
                            onChange={(e) => ctx.set(k, e.target.value)}
                          />
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "question":
      return <QuestionView q={block} ctx={ctx} />;
  }
}

export function SimpleTable({ header, rows }: { header?: string[]; rows: string[][] }) {
  return (
    <table className="avoid-break w-full border-collapse text-[15px]">
      {header && (
        <thead>
          <tr className="bg-brand-soft">
            {header.map((h) => (
              <th key={h} className="border border-black/20 px-2 py-1.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={`whitespace-pre-line border border-black/20 px-2 py-1.5 ${j === 0 && header ? "font-bold" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- 문항 ----------

function QuestionView({ q, ctx }: { q: Question; ctx: Ctx }) {
  return (
    <div className="avoid-break">
      {(q.label || q.prompt) && (
        <p className="font-medium leading-relaxed">
          {q.label && <span className="mr-1.5 font-bold">{q.label}</span>}
          <Rich text={q.prompt} />
          <Mark ctx={ctx} k={q.id} />
        </p>
      )}
      {q.quote && <p className="mt-1 pl-6 italic">{q.quote}</p>}
      <div className="mt-2 pl-6">
        <QuestionBody q={q} ctx={ctx} />
      </div>
    </div>
  );
}

function QuestionBody({ q, ctx }: { q: Question; ctx: Ctx }) {
  const { mode, answers, set, locked } = ctx;
  switch (q.type) {
    case "mc":
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {q.choices.map((c, i) =>
            mode === "print" ? (
              <span key={i}>
                {CIRCLED[i]} {c}
              </span>
            ) : (
              <ChoiceButton key={i} active={answers[q.id] === i} disabled={locked} onClick={() => set(q.id, i)}>
                {CIRCLED[i]} {c}
              </ChoiceButton>
            ),
          )}
        </div>
      );

    case "multi": {
      const picked = (answers[q.id] as number[] | undefined) ?? [];
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {q.choices.map((c, i) =>
            mode === "print" ? (
              <span key={i} className="text-lg">
                {c}
              </span>
            ) : (
              <ChoiceButton
                key={i}
                active={picked.includes(i)}
                disabled={locked}
                onClick={() =>
                  set(q.id, picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i].sort())
                }
              >
                {c}
              </ChoiceButton>
            ),
          )}
        </div>
      );
    }

    case "short":
      return mode === "print" ? (
        <Line />
      ) : (
        <input
          aria-label={`${q.label} 답`}
          className={inputCls("w-full")}
          value={(answers[q.id] as string) ?? ""}
          disabled={locked}
          onChange={(e) => set(q.id, e.target.value)}
        />
      );

    case "essay": {
      const lines = q.lines ?? 2;
      return mode === "print" ? (
        <>
          {Array.from({ length: lines }, (_, i) => (
            <Line key={i} />
          ))}
        </>
      ) : (
        <textarea
          aria-label={`${q.label} 답`}
          rows={lines + 1}
          className={inputCls("w-full resize-y rounded-md border px-2")}
          value={(answers[q.id] as string) ?? ""}
          disabled={locked}
          onChange={(e) => set(q.id, e.target.value)}
        />
      );
    }

    case "ox":
      return (
        <div className="space-y-2">
          {q.items.map((it, i) => {
            const k = subKey(q.id, i);
            return (
              <div key={i} className="flex flex-wrap items-center gap-3">
                <span>{it.text}</span>
                {mode === "print" ? (
                  <span>(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                ) : (
                  <span className="flex gap-1.5">
                    {(["O", "X"] as const).map((v) => (
                      <ChoiceButton key={v} active={answers[k] === v} disabled={locked} onClick={() => set(k, v)}>
                        {v}
                      </ChoiceButton>
                    ))}
                  </span>
                )}
                <Mark ctx={ctx} k={k} />
              </div>
            );
          })}
        </div>
      );

    case "blank": {
      const many = q.items.length === 1 && q.items[0].text.split("___").length > 4;
      // "bike ___"처럼 짧은 항목이 여럿이면 3칸 격자로
      const grid = q.items.length > 4 && q.items.every((it) => it.text.length < 20);
      return (
        <div className={grid ? "grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3" : "space-y-2"}>
          {q.items.map((it, i) => {
            const parts = it.text.split("___");
            return (
              <p key={i} className="whitespace-pre-wrap leading-[2.4]">
                {parts.map((p, j) => {
                  const k = subKey(q.id, i, j);
                  return (
                    <span key={j}>
                      {p}
                      {j < parts.length - 1 &&
                        (mode === "print" ? (
                          <span className={`inline-block border-b border-black ${many ? "w-6" : "w-28"}`}>&nbsp;</span>
                        ) : (
                          <>
                            <input
                              aria-label={`${q.label} 빈칸`}
                              className={inputCls(many ? "w-10 text-center" : grid ? "w-24" : "w-32")}
                              value={(answers[k] as string) ?? ""}
                              disabled={locked}
                              onChange={(e) => set(k, e.target.value)}
                            />
                            <Mark ctx={ctx} k={k} />
                          </>
                        ))}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      );
    }

    case "pick":
      return (
        <div className="space-y-2">
          {q.items.map((it, i) => {
            const k = subKey(q.id, i);
            const [before, after = ""] = it.text.split("___");
            return (
              <p key={i} className="leading-[2.2]">
                {before}
                {mode === "print" ? (
                  <span>( {it.options.join(" / ")} )</span>
                ) : (
                  <span className="mx-1 inline-flex gap-1 align-middle">
                    {it.options.map((o) => (
                      <ChoiceButton key={o} active={answers[k] === o} disabled={locked} onClick={() => set(k, o)}>
                        {o}
                      </ChoiceButton>
                    ))}
                  </span>
                )}
                {after}
                <Mark ctx={ctx} k={k} />
              </p>
            );
          })}
        </div>
      );

    case "phonics":
      return (
        <table className="w-full border-collapse text-[15px]">
          <tbody>
            {q.rows.map((r, i) => (
              <tr key={i}>
                <th className="min-w-28 border border-black/20 bg-brand-soft px-2 py-1.5 text-left text-sm font-medium">{r.label}</th>
                {r.words.map((w, j) => {
                  const k = subKey(q.id, i, j);
                  return (
                    <td key={j} className={`border border-black/20 px-2 py-1.5 ${mode === "print" ? "whitespace-nowrap" : ""}`}>
                      <span className="font-medium">{w}</span>{" "}
                      {mode === "print" ? (
                        <span>(&nbsp;&nbsp;&nbsp;)</span>
                      ) : (
                        <span className="mt-1 flex gap-1">
                          {["○", "△", "×"].map((v) => (
                            <ChoiceButton key={v} small active={answers[k] === v} disabled={locked} onClick={() => set(k, v)}>
                              {v}
                            </ChoiceButton>
                          ))}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "survey":
      return (
        <div className="space-y-3">
          {q.items.map((it, i) => {
            const k = subKey(q.id, i);
            return (
              <div key={i}>
                <p>· {it.text}</p>
                {it.options ? (
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 pl-3">
                    {it.options.map((o) =>
                      mode === "print" ? (
                        <span key={o}>(&nbsp;&nbsp;) {o}</span>
                      ) : (
                        <ChoiceButton key={o} active={answers[k] === o} disabled={locked} onClick={() => set(k, o)}>
                          {o}
                        </ChoiceButton>
                      ),
                    )}
                  </div>
                ) : mode === "print" ? (
                  <Line />
                ) : (
                  <input
                    aria-label={it.text}
                    className={inputCls("ml-3 w-[calc(100%-0.75rem)]")}
                    value={(answers[k] as string) ?? ""}
                    disabled={locked}
                    onChange={(e) => set(k, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
  }
}

// ---------- 작은 부품 ----------

function inputCls(extra: string) {
  return `border-0 border-b-2 border-black/30 bg-transparent px-1 py-0.5 text-[16px] outline-none focus:border-brand disabled:opacity-80 ${extra}`;
}

function Line() {
  return <div className="h-8 border-b border-black/60" />;
}

function ChoiceButton({
  active,
  disabled,
  small,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border text-left transition ${small ? "px-2 py-0 text-sm" : "px-3 py-1"} ${
        active ? "border-brand bg-brand text-white" : "border-black/20 bg-white hover:border-brand"
      } disabled:cursor-default`}
    >
      {children}
    </button>
  );
}

function Mark({ ctx, k }: { ctx: Ctx; k: string }) {
  if (ctx.mode !== "solve" || !ctx.marks || !(k in ctx.marks)) return null;
  const v = ctx.marks[k];
  const [label, cls] =
    v === true ? ["맞았어요", "bg-green-100 text-green-800"] : v === false ? ["다시 보기", "bg-orange-100 text-orange-800"] : ["엄마 확인", "bg-black/5 text-muted"];
  return <span className={`ml-2 inline-block rounded px-1.5 py-0.5 align-middle text-xs font-medium ${cls}`}>{label}</span>;
}
