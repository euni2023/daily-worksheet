import { Suspense } from "react";
import ParentGate from "@/components/parent-gate";
import { listDays } from "@/lib/content";
import AnswerSheet from "./answer-sheet";

export function generateStaticParams() {
  return listDays().map((d) => ({ id: d.id }));
}

// 정답은 PIN을 넣은 뒤 API에서 받아 온다 (페이지 HTML에는 정답이 없다)
export default function ParentDayPage({ params }: PageProps<"/parent/day/[id]">) {
  return (
    <ParentGate>
      <Suspense fallback={<p className="p-8 text-center text-muted">불러오는 중...</p>}>
        <Content params={params} />
      </Suspense>
    </ParentGate>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnswerSheet dayId={id} />;
}
