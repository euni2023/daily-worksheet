import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { GradeItem } from "./grading";

// API 키는 서버 환경변수 ANTHROPIC_API_KEY에서만 읽는다 (브라우저로 보내지 않음)
export const MODEL = "claude-opus-5-5";

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  return (client ??= new Anthropic());
}

const TEACHER = `너는 초등학교 6학년 학생의 매일 학습지(어휘, 짧은 글 읽기, 문장 쓰기, 영어)를 채점하는 다정한 선생님이다.
학생은 공부에 흥미가 낮고 어휘력과 영어 기초가 부족하며, 자전거와 볼링 같은 운동을 좋아한다.
채점은 공정하게 하되, 뜻이 맞으면 맞춤법이나 띄어쓰기가 조금 달라도 맞은 것으로 본다.
영어 문장을 직접 쓰는 문항은 대문자와 마침표까지 확인한다.`;

const FEEDBACK_RULES = `feedback 작성 규칙:
- 학생에게 직접 말하는 반말이 아닌 다정한 존댓말("~했어요")로, 초6 눈높이의 쉬운 말로 3~4문장.
- 칭찬을 먼저 구체적으로 한다(끝까지 푼 것, 잘한 문항이나 영역).
- 틀린 것은 꾸짖지 말고, 다음에 한 가지만 해 보자고 가볍게 권한다.
- 정답을 직접 알려 주지 않는다. 이모지와 특수 기호는 쓰지 않는다.`;

async function ask<S extends z.ZodType>(
  schema: S,
  content: Anthropic.Beta.BetaContentBlockParam[],
  effort: "low" | "medium",
): Promise<z.infer<S>> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // 안전 분류기가 거절하면 서버가 알맞은 모델로 다시 시도한다
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: TEACHER,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new Error(`AI 응답을 받지 못했어요 (${res.stop_reason})`);
  }
  return res.parsed_output as z.infer<S>;
}

function describeItem(item: GradeItem) {
  const lines = [`- key: ${item.key} | ${item.label}번 | ${item.prompt}`];
  if (item.expected.length) lines.push(`  정답: ${item.expected.join(" 또는 ")}`);
  if (item.sample) lines.push(`  예시 답: ${item.sample}`);
  if (item.rubric) lines.push(`  채점 기준: ${item.rubric}`);
  return lines.join("\n");
}

// ---------- 화면에서 푼 답안 ----------

const TextGrade = z.object({
  judgments: z.array(z.object({ key: z.string(), correct: z.boolean(), note: z.string() })),
  feedback: z.string(),
});

export async function reviewTextAnswers(args: {
  title: string;
  review: { item: GradeItem; given: string }[];
  autoSummary: string; // "맞은 문항: ..., 틀린 문항: ..."
}) {
  const reviewText = args.review.length
    ? args.review.map(({ item, given }) => `${describeItem(item)}\n  학생 답: ${given}`).join("\n")
    : "(없음)";
  const prompt = `학습지: ${args.title}

[자동 채점 결과]
${args.autoSummary}

[다시 판단할 문항] 서술형이거나, 직접 쓴 답이 정답 목록과 글자가 달라 자동 채점에서 틀림으로 나온 문항이다.
뜻이 정답이나 채점 기준과 맞으면 correct=true로 바꾼다. note에는 엄마가 볼 짧은 채점 메모를 쓴다.
${reviewText}

${FEEDBACK_RULES}`;
  return ask(TextGrade, [{ type: "text", text: prompt }], "low");
}

// ---------- 종이 학습지 사진 ----------

const PhotoGrade = z.object({
  items: z.array(z.object({ key: z.string(), given: z.string(), correct: z.boolean(), note: z.string() })),
  feedback: z.string(),
});

export async function gradePhotos(args: { title: string; items: GradeItem[]; images: string[] }) {
  const imageBlocks: Anthropic.Beta.BetaContentBlockParam[] = args.images.map((url) => {
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(url);
    if (!m) throw new Error("사진 형식을 읽지 못했어요.");
    return {
      type: "image",
      source: { type: "base64", media_type: m[1] as "image/jpeg", data: m[2] },
    };
  });
  const prompt = `위 사진은 학생이 종이에 푼 학습지 "${args.title}"이다.
아래 채점 항목마다 학생이 쓴 답을 사진에서 찾아 given에 그대로 옮겨 적고(동그라미 친 보기는 그 보기 글자를 적는다), 정답과 비교해 correct를 정한다.
답을 찾을 수 없거나 비어 있으면 given은 빈 문자열, correct=false로 한다. 손글씨가 애매하면 note에 그렇게 적는다.
모든 key를 빠짐없이 한 번씩 돌려준다.

[채점 항목]
${args.items.map(describeItem).join("\n")}

${FEEDBACK_RULES}`;
  return ask(PhotoGrade, [...imageBlocks, { type: "text", text: prompt }], "medium");
}

// ---------- 엄마용 요약 ----------

const ParentSummary = z.object({
  overview: z.string(),
  wrong: z.array(z.string()),
  weakAreas: z.array(z.string()),
  nextSteps: z.array(z.string()),
});
export type ParentSummary = z.infer<typeof ParentSummary>;

export async function summarizeForParent(record: string) {
  const prompt = `아래는 학생의 회차별 학습지 결과다. 엄마가 읽을 요약을 만든다.
- overview: 전체 흐름 2~3문장 (잘하고 있는 점 먼저)
- wrong: 틀린 문제를 "Day N 번호: 무엇을 헷갈렸는지" 형식으로 (최근 것부터, 최대 10개)
- weakAreas: 약한 영역과 그 근거 (파닉스 표의 △·× 줄도 반영)
- nextSteps: 다음 학습지에서 할 일 3~5개, 구체적으로
이모지는 쓰지 않는다.

${record}`;
  return ask(ParentSummary, [{ type: "text", text: prompt }], "medium");
}
