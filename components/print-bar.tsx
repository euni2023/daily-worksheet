"use client";

export default function PrintBar({ note }: { note?: string }) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 sm:px-0">
      <p className="text-sm text-muted">
        {note ?? "인쇄 창에서 'PDF로 저장'을 고르면 PDF 파일로 저장돼요. 용지는 A4로 맞춰 주세요."}
      </p>
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-95"
      >
        인쇄/PDF 저장
      </button>
    </div>
  );
}
