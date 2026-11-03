import type { Day, Question } from "./types";

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

// 문항 하나의 정답을 사람이 읽는 글로 (엄마 화면 정답표)
export function answerText(q: Question): string {
  switch (q.type) {
    case "mc":
      return `${CIRCLED[q.answer]} ${q.choices[q.answer]}`;
    case "multi":
      return q.answer.map((i) => q.choices[i]).join(", ");
    case "short":
      return q.answer[0];
    case "essay":
      return q.sample ? `(예) ${q.sample}` : "자유롭게";
    case "ox":
      return q.items.map((it, i) => `(${i + 1}) ${it.answer}`).join("  ");
    case "pick":
      return q.items.map((it, i) => `(${i + 1}) ${it.answer}`).join("  ");
    case "blank":
      return q.items
        .map((it, i) => {
          const a = it.answers.map((alts) => alts[0]).join(" / ");
          return q.items.length > 1 ? `(${i + 1}) ${a}` : a;
        })
        .join("  ");
    case "phonics":
      return "엄마가 듣고 ○△× 표시";
    case "survey":
      return "-";
  }
}

// 학습지에 정답표가 따로 없으면 문항에서 만든다
export function answerRows(day: Day): string[][] {
  const rows: string[][] = [];
  for (const s of day.sections)
    for (const b of s.blocks)
      if (b.kind === "question" && b.type !== "survey")
        rows.push([b.label.replace(/\.$/, "") || b.id, answerText(b), b.explain ?? (b.type === "essay" ? b.rubric ?? "" : "")]);
  return rows;
}
