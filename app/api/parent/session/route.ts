import { isParent } from "@/lib/parent-auth";

// 엄마 화면이 잠겨 있는지 확인
export async function POST(req: Request) {
  return Response.json({ ok: isParent(req) });
}
