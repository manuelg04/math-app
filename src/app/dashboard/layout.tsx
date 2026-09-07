import { isAuthenticated } from "@/lib/auth-server";
import { redirect } from "next/navigation";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/login");
  return children;
}
