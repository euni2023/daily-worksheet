// 제출 기록은 이 브라우저의 localStorage에 둔다.
// 나중에 Vercel KV나 Supabase로 옮길 때 이 파일의 함수만 바꾸면 된다.
import type { Answers, Submission } from "./types";

const SUBMISSIONS_KEY = "dw:submissions";
const draftKey = (dayId: string) => `dw:draft:${dayId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 없거나 막혀 있으면 조용히 넘어간다
  }
}

export function getSubmissions(): Submission[] {
  return read<Submission[]>(SUBMISSIONS_KEY, []);
}

export function addSubmission(s: Submission) {
  write(SUBMISSIONS_KEY, [...getSubmissions(), s]);
}

// 회차별 가장 최근 제출
export function latestByDay(): Record<string, Submission> {
  const out: Record<string, Submission> = {};
  for (const s of getSubmissions()) {
    if (!out[s.dayId] || out[s.dayId].submittedAt < s.submittedAt) out[s.dayId] = s;
  }
  return out;
}

export function getDraft(dayId: string): Answers {
  return read<Answers>(draftKey(dayId), {});
}

export function saveDraft(dayId: string, answers: Answers) {
  write(draftKey(dayId), answers);
}

export function clearDraft(dayId: string) {
  try {
    localStorage.removeItem(draftKey(dayId));
  } catch {}
}
