import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { readAuthToken } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";
import { getDashboardData } from "@/server/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  noStore();
  const token = await readAuthToken();
  if (!token) {
    redirect("/login");
  }

  const result = await getDashboardData(token.sub);
  if (result.status === "NOT_FOUND") {
    redirect("/login");
  }
  if (result.status === "ONBOARDING_REQUIRED") {
    redirect("/onboarding");
  }

  return <DashboardClient initialData={result.data} />;
}
