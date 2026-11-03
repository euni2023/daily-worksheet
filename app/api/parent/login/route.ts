import { cookies } from "next/headers";
import { checkPin, COOKIE, pinConfigured, sessionCookie } from "@/lib/parent-auth";

// PIN 확인 후 엄마 화면 쿠키를 준다
export async function POST(req: Request) {
  if (!pinConfigured()) {
    return Response.json({ error: "PIN이 아직 설정되지 않았어요. 환경변수 PARENT_PIN을 넣어 주세요." }, { status: 503 });
  }
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  if (!pin || !checkPin(pin)) {
    await new Promise((r) => setTimeout(r, 600)); // 마구 눌러 보기 늦추기
    return Response.json({ error: "PIN이 맞지 않아요." }, { status: 401 });
  }
  (await cookies()).set(sessionCookie());
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(COOKIE);
  return Response.json({ ok: true });
}
