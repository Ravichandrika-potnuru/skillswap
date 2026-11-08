import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthExperience from "@/components/AuthExperience";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSession();
  if (user) redirect(user.role === "admin" ? "/admin" : user.account_status === "approved" ? "/dashboard" : "/pending");
  return <AuthExperience />;
}
