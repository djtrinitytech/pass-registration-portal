import { requireStaffPage } from "@/lib/staff-auth";
import { SuperAdminPortal } from "@/components/super-admin-portal";
export const dynamic = "force-dynamic";
export default async function SuperAdminPage() {
  await requireStaffPage("super");
  return <main className="admin-page"><SuperAdminPortal /></main>;
}
