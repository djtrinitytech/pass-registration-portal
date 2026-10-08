import { GateScanner } from "@/components/gate-scanner";
import { requireStaffPage } from "@/lib/staff-auth";
export const dynamic = "force-dynamic";
export default async function GatePage() {
  await requireStaffPage("gate");
  return <GateScanner />;
}
