import ParentGate from "@/components/parent-gate";
import { listDays } from "@/lib/content";
import Dashboard from "./dashboard";

export default function ParentPage() {
  return (
    <ParentGate>
      <Dashboard days={listDays()} />
    </ParentGate>
  );
}
