import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Block, Day } from "./types";

const DAYS_DIR = path.join(process.cwd(), "content", "days");
const ID_PATTERN = /^day\d{2,3}$/;

export type DaySummary = Pick<Day, "id" | "number" | "title" | "subtitle" | "stage">;

export function listDays(): DaySummary[] {
  return fs
    .readdirSync(DAYS_DIR)
    .filter((f) => ID_PATTERN.test(f.replace(/\.json$/, "")))
    .map((f) => {
      const d = readDay(f.replace(/\.json$/, ""))!;
      return { id: d.id, number: d.number, title: d.title, subtitle: d.subtitle, stage: d.stage };
    })
    .sort((a, b) => a.number - b.number);
}

function readDay(id: string): Day | null {
  if (!ID_PATTERN.test(id)) return null;
  const file = path.join(DAYS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Day;
}

// 엄마 화면·채점용: 정답 포함
export function getDay(id: string): Day | null {
  return readDay(id);
}

// 학생 화면용: 정답·해설·엄마용 안내를 뺀다
export function getStudentDay(id: string): Day | null {
  const day = readDay(id);
  if (!day) return null;
  return {
    ...day,
    parentGuide: undefined,
    sections: day.sections.map((s) => ({ ...s, blocks: s.blocks.map(stripAnswers) })),
  };
}

function stripAnswers(b: Block): Block {
  if (b.kind !== "question") return b;
  const q = { ...b, explain: undefined } as Record<string, unknown>;
  switch (b.type) {
    case "mc":
    case "multi":
    case "short":
      delete q.answer;
      break;
    case "essay":
      delete q.sample;
      delete q.rubric;
      break;
    case "ox":
      q.items = b.items.map((i) => ({ text: i.text }));
      break;
    case "blank":
      q.items = b.items.map((i) => ({ text: i.text }));
      break;
    case "pick":
      q.items = b.items.map((i) => ({ text: i.text, options: i.options }));
      break;
  }
  return q as Block;
}
