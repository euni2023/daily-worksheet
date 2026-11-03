import "server-only";
import { subKey } from "./keys";
import type { Answers, Area, Day, GradeResult, ItemResult, Question } from "./types";

// 채점할 항목 하나. 정답 정보까지 들고 있다 (서버에서만 쓴다).
export type GradeItem = {
  key: string;
  questionId: string;
  label: string;
  area: Area;
  prompt: string; // 문제 + 하위 항목 문장
  expected: string[]; // 맞는 답 후보 (서술형은 빈 배열)
  sample?: string;
  rubric?: string;
  essay: boolean;
  strict: boolean; // 영어 문장처럼 대문자·마침표까지 보는 문항
};

// 학습지에서 채점할 항목을 모두 뽑는다. 파닉스(엄마가 듣고 표시)와 자기평가는 점수에 넣지 않는다.
export function gradeItems(day: Day): GradeItem[] {
  const out: GradeItem[] = [];
  for (const section of day.sections) {
    for (const b of section.blocks) {
      if (b.kind !== "question") continue;
      out.push(...itemsOf(b, section.area));
    }
  }
  return out;
}

function itemsOf(q: Question, area: Area): GradeItem[] {
  const base = q.label.replace(/\.$/, "") || q.id;
  const head = q.quote ? `${q.prompt} [${q.quote}]` : q.prompt;
  const one = (extra: Partial<GradeItem>): GradeItem => ({
    key: q.id,
    questionId: q.id,
    label: base,
    area,
    prompt: head,
    expected: [],
    essay: false,
    strict: false,
    ...extra,
  });

  switch (q.type) {
    case "mc":
      return [one({ prompt: `${head} (보기: ${q.choices.join(" / ")})`, expected: [q.choices[q.answer]] })];
    case "multi":
      return [
        one({
          prompt: `${head} (보기: ${q.choices.join(", ")})`,
          expected: [q.answer.map((i) => q.choices[i]).join(", ")],
        }),
      ];
    case "short":
      return [one({ expected: q.answer, strict: q.answer.some(isEnglishSentence) })];
    case "essay":
      return [one({ essay: true, sample: q.sample, rubric: q.rubric })];
    case "ox":
      return q.items.map((it, i) => ({
        ...one({}),
        key: subKey(q.id, i),
        label: `${base}-(${i + 1})`,
        prompt: `${head} ${it.text}`,
        expected: [it.answer],
      }));
    case "pick":
      return q.items.map((it, i) => ({
        ...one({}),
        key: subKey(q.id, i),
        label: `${base}-(${i + 1})`,
        prompt: `${head} ${it.text.replace("___", `(${it.options.join(" / ")})`)}`,
        expected: [it.answer],
      }));
    case "blank":
      return q.items.flatMap((it, i) =>
        it.answers.map((ans, j) => ({
          ...one({}),
          key: subKey(q.id, i, j),
          label:
            q.items.length === 1
              ? `${base} 빈칸${j + 1}`
              : it.answers.length === 1
                ? `${base}-(${i + 1})`
                : `${base}-(${i + 1}) 빈칸${j + 1}`,
          prompt: `${head} ${it.text}`,
          expected: ans,
        })),
      );
    case "phonics":
    case "survey":
      return [];
  }
}

function isEnglishSentence(s: string) {
  return /[A-Za-z]/.test(s) && s.trim().includes(" ");
}

// 학생 답을 사람이 읽는 글자로
export function givenText(day: Day, item: GradeItem, answers: Answers): string {
  const v = answers[item.key];
  if (v === undefined || v === null) return "";
  const q = findQuestion(day, item.questionId);
  if (q?.type === "mc" && typeof v === "number") return q.choices[v] ?? "";
  if (q?.type === "multi" && Array.isArray(v)) return (v as number[]).map((i) => q.choices[i]).join(", ");
  return String(v).trim();
}

function findQuestion(day: Day, id: string): Question | undefined {
  for (const s of day.sections)
    for (const b of s.blocks) if (b.kind === "question" && b.id === id) return b;
}

const loose = (s: string) => s.toLowerCase().replace(/[\s.,!?~'"’()·]/g, "");
const tidy = (s: string) => s.trim().replace(/\s+/g, " ").replace(/’/g, "'");

export function autoCheck(item: GradeItem, given: string): boolean {
  if (!given) return false;
  return item.expected.some((e) => (item.strict ? tidy(e) === tidy(given) : loose(e) === loose(given)));
}

// 화면 답안 1차 채점. AI가 다시 볼 항목(서술형, 표현만 다를 수 있는 오답)을 함께 돌려준다.
export function gradeAnswers(day: Day, answers: Answers) {
  const items = gradeItems(day);
  const results: ItemResult[] = [];
  const review: { item: GradeItem; given: string }[] = [];
  for (const item of items) {
    const given = givenText(day, item, answers);
    let correct: boolean | null = item.essay ? null : autoCheck(item, given);
    if (!given) correct = false;
    else if (item.essay || (!correct && isWritten(day, item))) review.push({ item, given });
    results.push({ key: item.key, questionId: item.questionId, label: item.label, area: item.area, given, correct });
  }
  return { items, results, review };
}

// 직접 쓴 답(단답·빈칸)만 AI가 다시 본다. 고르는 문제는 자동 채점이 확정.
function isWritten(day: Day, item: GradeItem) {
  const t = findQuestion(day, item.questionId)?.type;
  return t === "short" || t === "blank";
}

export function summarize(results: ItemResult[], feedback: string, aiUsed: boolean): GradeResult {
  const scored = results.filter((r) => r.correct !== null);
  const byArea: GradeResult["byArea"] = {};
  for (const r of scored) {
    const a = (byArea[r.area] ??= { score: 0, total: 0 });
    a.total++;
    if (r.correct) a.score++;
  }
  return {
    items: results,
    score: scored.filter((r) => r.correct).length,
    total: scored.length,
    byArea,
    feedback,
    aiUsed,
  };
}
