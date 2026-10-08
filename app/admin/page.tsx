import { AdminPortal } from "@/components/admin-portal";
import { requireStaffPage } from "@/lib/staff-auth";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  await requireStaffPage("desk");
  return <main className="admin-page"><AdminPortal /></main>;
}
