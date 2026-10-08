import { StaffLogin } from "@/components/staff-login";
export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const role = (await searchParams).role === "super" ? "super" : (await searchParams).role === "gate" ? "gate" : "desk";
  return <main className="site-shell garba-site staff-login-page"><StaffLogin role={role} /></main>;
}
