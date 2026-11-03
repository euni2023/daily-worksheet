import { listDays } from "@/lib/content";
import DayList from "./day-list";

export default function Home() {
  const days = listDays();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">오늘도 한 장!</h1>
      <p className="mt-1 text-muted">하루 50~60분. 어휘, 글 읽기, 문장 쓰기, 영어 순서로 풀어요.</p>
      <DayList days={days} />
    </div>
  );
}
