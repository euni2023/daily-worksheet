import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStudentDay, listDays } from "@/lib/content";
import Solver from "./solver";

export function generateStaticParams() {
  return listDays().map((d) => ({ id: d.id }));
}

export default function DayPage({ params }: PageProps<"/day/[id]">) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">학습지를 불러오는 중...</p>}>
      <DayContent params={params} />
    </Suspense>
  );
}

async function DayContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const day = getStudentDay(id);
  if (!day) notFound();
  return <Solver day={day} />;
}
