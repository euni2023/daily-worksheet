import Anthropic from "@anthropic-ai/sdk";
import { hasApiKey, summarizeForParent } from "@/lib/ai";
import { getDay } from "@/lib/content";
import { gradeItems } from "@/lib/grading";
import { subKey } from "@/lib/keys";
import { isParent } from "@/lib/parent-auth";
import { AREA_LABEL, type Submission } from "@/lib/types";

export const maxDuration = 120;

// 회차별 기록을 받아 엄마용 AI 요약을 만든다 (기록은 브라우저 localStorage에 있어서 함께 보내 준다)
export async function POST(req: Request) {
  if (!isParent(req)) return Response.json({ error: "PIN을 먼저 입력해 주세요." }, { status: 401 });
  if (!hasApiKey()) return Response.json({ error: "AI 요약은 ANTHROPIC_API_KEY를 설정해야 쓸 수 있어요." }, { status: 503 });

  const { submissions } = (await req.json().catch(() => ({}))) as { submissions?: Submission[] };
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return Response.json({ error: "아직 제출한 학습지가 없어요." }, { status: 400 });
  }

  const record = submissions.slice(-20).map(describe).filter(Boolean).join("\n\n");
  try {
    return Response.json(await summarizeForParent(record));
  } catch (e) {
    console.error("[summary]", e);
    const msg = e instanceof Anthropic.APIError ? "AI 요약 서버에 문제가 생겼어요. 잠시 후 다시 해 보세요." : "요약하지 못했어요.";
    return Response.json({ error: msg }, { status: 502 });
  }
}

function describe(s: Submission): string {
  const day = getDay(s.dayId);
  if (!day || !s.result) return "";
  const items = new Map(gradeItems(day).map((i) => [i.key, i]));
  const lines = [
    `## ${day.title} (${s.submittedAt.slice(0, 10)}, ${s.mode === "photo" ? "종이 사진" : "화면"}) 점수 ${s.result.score}/${s.result.total}`,
    "영역별: " +
      Object.entries(s.result.byArea)
        .map(([a, v]) => `${AREA_LABEL[a as keyof typeof AREA_LABEL]} ${v!.score}/${v!.total}`)
        .join(", "),
  ];
  const wrong = s.result.items.filter((r) => r.correct === false);
  if (wrong.length) {
    lines.push("틀린 문항:");
    for (const r of wrong) {
      const it = items.get(r.key);
      const expected = it?.expected.length ? it.expected[0] : it?.sample ?? "";
      lines.push(`- ${r.label}번 ${it?.prompt ?? ""} / 학생 답: ${r.given || "(비어 있음)"} / 정답: ${expected}${r.note ? ` / 메모: ${r.note}` : ""}`);
    }
  }
  // 파닉스 소리 내어 읽기(엄마가 ○△× 표시)와 자기평가
  for (const sec of day.sections) {
    for (const b of sec.blocks) {
      if (b.kind !== "question" || !s.answers) continue;
      if (b.type === "phonics") {
        const marks = b.rows.map(
          (row, i) => `${row.label}: ${row.words.map((w, j) => `${w}${s.answers![subKey(b.id, i, j)] ?? "(-)"}`).join(" ")}`,
        );
        lines.push("파닉스 읽기 표시:", ...marks.map((m) => `- ${m}`));
      }
      if (b.type === "survey") {
        const said = b.items.map((it, i) => `${it.text} ${s.answers![subKey(b.id, i)] ?? "-"}`);
        lines.push("자기평가/설문: " + said.join(" / "));
      }
    }
  }
  return lines.join("\n");
}
