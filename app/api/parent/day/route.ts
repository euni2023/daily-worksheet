import { getDay } from "@/lib/content";
import { isParent } from "@/lib/parent-auth";

// 정답이 들어 있는 학습지 전체 (엄마만)
export async function POST(req: Request) {
  if (!isParent(req)) return Response.json({ error: "PIN을 먼저 입력해 주세요." }, { status: 401 });
  const { dayId } = (await req.json().catch(() => ({}))) as { dayId?: string };
  const day = dayId ? getDay(dayId) : null;
  if (!day) return Response.json({ error: "학습지를 찾지 못했어요." }, { status: 404 });
  return Response.json(day);
}
