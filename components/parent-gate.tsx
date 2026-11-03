"use client";

import { useEffect, useState, type ReactNode } from "react";

// PIN을 넣어야 children을 보여 준다. 확인은 서버(httpOnly 쿠키)에서 한다.
export default function ParentGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/parent/session", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setState(d.ok ? "open" : "locked"))
      .catch(() => setState("locked"));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/parent/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) setState("open");
    else setError((await res.json().catch(() => ({}))).error ?? "PIN이 맞지 않아요.");
    setPin("");
  }

  if (state === "checking") return <p className="p-8 text-center text-muted">확인하는 중...</p>;
  if (state === "open") return <>{children}</>;

  return (
    <form onSubmit={login} className="mx-auto mt-16 max-w-xs rounded-2xl bg-paper p-6 text-center shadow-sm">
      <h1 className="text-lg font-bold">엄마 화면</h1>
      <p className="mt-1 text-sm text-muted">PIN을 입력해 주세요.</p>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        aria-label="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="mt-4 w-full rounded-lg border border-black/20 px-3 py-2 text-center text-xl tracking-[0.5em] outline-none focus:border-brand"
      />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy || !pin} className="mt-4 w-full rounded-lg bg-brand py-2 font-bold text-white disabled:opacity-50">
        열기
      </button>
    </form>
  );
}

export async function logout() {
  await fetch("/api/parent/login", { method: "DELETE" });
  location.reload();
}
