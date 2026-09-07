import { isAuthenticated } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
export default async function Page() {
  if (!(await isAuthenticated())) redirect("/login");
  return <ProfileForm onboarding />;
}
