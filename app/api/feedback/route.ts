import Anthropic from "@anthropic-ai/sdk";
import { gradePhotos, hasApiKey, reviewTextAnswers } from "@/lib/ai";
import { getDay } from "@/lib/content";
import { gradeAnswers, gradeItems, summarize } from "@/lib/grading";
import type { Answers, ItemResult } from "@/lib/types";

// 사진 채점은 시간이 좀 걸린다
export const maxDuration = 120;

const MAX_IMAGES = 6;
const MAX_IMAGE_CHARS = 5_000_000; // data URL 한 장 약 3.7MB

type Body = { dayId?: string; answers?: Answers; images?: string[] };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return error("요청을 읽지 못했어요.", 400);
  }
  const day = body.dayId ? getDay(body.dayId) : null;
  if (!day) return error("학습지를 찾지 못했어요.", 404);

  try {
    if (body.images) return await photo(day, body.images);
    if (body.answers && typeof body.answers === "object") return await screen(day, body.answers);
    return error("답안이나 사진이 필요해요.", 400);
  } catch (e) {
    console.error("[feedback]", e);
    if (e instanceof Anthropic.AuthenticationError) return error("API 키가 올바르지 않아요. 엄마께 알려 주세요.", 500);
    if (e instanceof Anthropic.RateLimitError) return error("잠시 후 다시 제출해 주세요.", 429);
    if (e instanceof Anthropic.APIError) return error("AI 채점 서버에 문제가 생겼어요. 잠시 후 다시 해 보세요.", 502);
    return error(e instanceof Error ? e.message : "채점하지 못했어요.", 500);
  }
}

async function screen(day: NonNullable<ReturnType<typeof getDay>>, answers: Answers) {
  const { results, review } = gradeAnswers(day, answers);

  if (!hasApiKey()) {
    // 키가 없으면 자동 채점만 하고, 서술형은 엄마 확인으로 남긴다
    const r = summarize(results, fallbackFeedback(results), false);
    return Response.json(r);
  }

  const reviewed = new Set(review.map((r) => r.item.key));
  const autoSummary = results
    .filter((r) => !reviewed.has(r.key))
    .map((r) => `${r.label}: ${r.correct ? "맞음" : r.given ? "틀림" : "비어 있음"}`)
    .join(", ");
  const ai = await reviewTextAnswers({ title: day.title, review, autoSummary });
  const byKey = new Map(ai.judgments.map((j) => [j.key, j]));
  const merged = results.map((r) => {
    const j = reviewed.has(r.key) ? byKey.get(r.key) : undefined;
    return j ? { ...r, correct: j.correct, note: j.note } : r;
  });
  return Response.json(summarize(merged, ai.feedback, true));
}

async function photo(day: NonNullable<ReturnType<typeof getDay>>, images: string[]) {
  if (!hasApiKey()) return error("사진 채점은 AI 키가 설정되어 있어야 해요. 화면에서 풀기를 이용해 주세요.", 503);
  if (!Array.isArray(images) || images.length === 0) return error("사진을 올려 주세요.", 400);
  if (images.length > MAX_IMAGES || images.some((s) => typeof s !== "string" || s.length > MAX_IMAGE_CHARS)) {
    return error("사진이 너무 많거나 커요.", 413);
  }

  const items = gradeItems(day);
  const ai = await gradePhotos({ title: day.title, items, images });
  const byKey = new Map(ai.items.map((i) => [i.key, i]));
  const results: ItemResult[] = items.map((item) => {
    const g = byKey.get(item.key);
    return {
      key: item.key,
      questionId: item.questionId,
      label: item.label,
      area: item.area,
      given: g?.given ?? "",
      correct: g ? g.correct : false,
      note: g?.note || undefined,
    };
  });
  return Response.json(summarize(results, ai.feedback, true));
}

function fallbackFeedback(results: ItemResult[]) {
  const right = results.filter((r) => r.correct).length;
  const pending = results.filter((r) => r.correct === null).length;
  return [
    "오늘 학습지를 끝까지 풀었어요. 정말 잘했어요!",
    `자동으로 채점한 문제 중 ${right}개를 맞혔어요.`,
    pending ? "글로 쓴 답은 엄마가 확인해 줄 거예요." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
