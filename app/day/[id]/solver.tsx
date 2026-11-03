"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Worksheet from "@/components/worksheet";
import { addSubmission, clearDraft, getDraft, saveDraft } from "@/lib/storage";
import type { AnswerValue, Answers, Day, GradeResult } from "@/lib/types";

type Tab = "screen" | "photo";

export default function Solver({ day }: { day: Day }) {
  const [tab, setTab] = useState<Tab>("screen");
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // 풀던 답은 브라우저에 임시 저장해 두었다가 다시 불러온다.
  // 불러오기가 끝난 뒤에만 저장해야 빈 답으로 덮어쓰지 않는다.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage는 마운트 뒤에만 읽을 수 있다 */
    setAnswers(getDraft(day.id));
    setLoadedId(day.id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [day.id]);
  useEffect(() => {
    if (loadedId === day.id && !result) saveDraft(day.id, answers);
  }, [loadedId, day.id, answers, result]);

  function set(key: string, value: AnswerValue) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  async function submit(body: object, mode: Tab) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId: day.id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "채점하지 못했어요.");
      const r = data as GradeResult;
      setResult(r);
      addSubmission({
        dayId: day.id,
        submittedAt: new Date().toISOString(),
        mode,
        answers: mode === "screen" ? answers : undefined,
        result: r,
      });
      clearDraft(day.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "채점하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers({});
  }

  const marks = result ? Object.fromEntries(result.items.map((i) => [i.key, i.correct])) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-0 py-6 sm:px-4">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-0">
        <Link href="/" className="text-sm text-muted hover:text-brand">
          ← 회차 목록
        </Link>
        <a
          href={`/print/${day.id}`}
          target="_blank"
          className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft"
        >
          인쇄/PDF 저장
        </a>
      </div>

      {result && <ResultCard result={result} onRetry={retry} />}

      {!result && (
        <div className="no-print mb-4 flex gap-2 px-4 sm:px-0" role="tablist">
          {(
            [
              ["screen", "화면에서 풀기"],
              ["photo", "종이에 푼 사진 올리기"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? "bg-brand text-white" : "bg-paper text-foreground shadow-sm"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "photo" && !result ? (
        <PhotoUpload busy={busy} onSubmit={(images) => submit({ images }, "photo")} />
      ) : (
        <>
          <Worksheet day={day} mode="solve" answers={answers} onChange={set} marks={marks} locked={!!result} />
          {!result && (
            <div className="no-print mt-6 px-4 text-center sm:px-0">
              <button
                onClick={() => {
                  if (Object.keys(answers).length === 0) return setError("아직 푼 문제가 없어요. 한 문제부터 시작해 볼까요?");
                  submit({ answers }, "screen");
                }}
                disabled={busy}
                className="rounded-xl bg-brand px-8 py-3 text-lg font-bold text-white shadow hover:opacity-95 disabled:opacity-60"
              >
                {busy ? "채점하는 중..." : "다 풀었어요! 제출하기"}
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className="no-print mt-4 px-4 text-center text-red-700">{error}</p>}
    </div>
  );
}

function ResultCard({ result, onRetry }: { result: GradeResult; onRetry: () => void }) {
  return (
    <div className="no-print mx-4 mb-6 rounded-2xl border-2 border-brand bg-paper p-5 shadow sm:mx-0">
      <p className="text-sm text-muted">오늘의 점수</p>
      <p className="text-3xl font-bold text-brand">
        {result.score} <span className="text-lg text-muted">/ {result.total}</span>
      </p>
      <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed">{result.feedback}</p>
      <p className="mt-3 text-sm text-muted">&apos;다시 보기&apos; 표시가 있는 문제는 엄마와 같이 확인해 봐요.</p>
      <button onClick={onRetry} className="mt-4 rounded-lg border border-brand px-4 py-1.5 text-sm text-brand hover:bg-brand-soft">
        처음부터 다시 풀기
      </button>
    </div>
  );
}

// 사진은 브라우저에서 줄여서(긴 변 1600px, JPEG) 보낸다
function PhotoUpload({ busy, onSubmit }: { busy: boolean; onSubmit: (images: string[]) => void }) {
  const [images, setImages] = useState<string[]>([]);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, 6)) out.push(await shrink(f));
    setImages(out);
  }

  return (
    <div className="mx-4 rounded-2xl bg-paper p-6 shadow-sm sm:mx-0">
      <p className="leading-relaxed">
        종이에 푼 학습지를 한 장씩 밝은 곳에서 찍어 올려 주세요. 여러 장을 한꺼번에 고를 수 있어요 (최대 6장).
      </p>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => onFiles(e.target.files)}
        className="mt-4 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
      />
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- 미리보기용 data URL
            <img key={i} src={src} alt={`올린 사진 ${i + 1}`} className="aspect-[3/4] w-full rounded object-cover" />
          ))}
        </div>
      )}
      <button
        onClick={() => onSubmit(images)}
        disabled={busy || images.length === 0}
        className="mt-5 w-full rounded-xl bg-brand py-3 text-lg font-bold text-white disabled:opacity-50"
      >
        {busy ? "사진을 보고 채점하는 중... (조금 걸려요)" : "사진으로 제출하기"}
      </button>
    </div>
  );
}

function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
