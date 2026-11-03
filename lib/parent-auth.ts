import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// 엄마 화면 PIN 잠금. PIN은 환경변수 PARENT_PIN에 두고,
// 로그인하면 PIN에서 만든 서명값을 httpOnly 쿠키로 준다.
export const COOKIE = "dw_parent";
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

function pin() {
  return process.env.PARENT_PIN?.trim() || "";
}

function token(p: string) {
  return createHmac("sha256", `daily-worksheet:${p}`).update("parent").digest("hex");
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function pinConfigured() {
  return pin().length > 0;
}

export function checkPin(input: string) {
  return pinConfigured() && same(token(String(input).trim()), token(pin()));
}

export function sessionCookie() {
  return {
    name: COOKIE,
    value: token(pin()),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

// Route Handler의 Request에서 쿠키를 읽어 확인한다
export function isParent(req: Request) {
  if (!pinConfigured()) return false;
  const raw = req.headers.get("cookie") ?? "";
  const value = raw
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === COOKIE)?.[1];
  return !!value && same(value, token(pin()));
}
