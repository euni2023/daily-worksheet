import { Suspense } from "react";
import { notFound } from "next/navigation";
import Worksheet from "@/components/worksheet";
import PrintBar from "@/components/print-bar";
import { getStudentDay, listDays } from "@/lib/content";

export function generateStaticParams() {
  return listDays().map((d) => ({ id: d.id }));
}

// 종이로 풀 빈 학습지 (정답 없음)
export default function PrintPage({ params }: PageProps<"/print/[id]">) {
  return (
    <div className="py-6">
      <PrintBar />
      <Suspense fallback={<p className="p-8 text-center text-muted">학습지를 불러오는 중...</p>}>
        <PrintContent params={params} />
      </Suspense>
    </div>
  );
}

async function PrintContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const day = getStudentDay(id);
  if (!day) notFound();
  return <Worksheet day={day} mode="print" />;
}
