import { neonAuth } from "@/lib/neon-auth";
import { query } from "@/lib/db";
import { installNeonAuthPinnedFetch } from "@/lib/neon-auth-fetch";

export async function getSession() {
  installNeonAuthPinnedFetch();
  const { data, error } = await neonAuth.getSession();
  if (error) {
    if (Number(error.status) >= 500 || String(error.code || "").startsWith("NETWORK_")) throw error;
    return null;
  }
  if (!data?.user?.id) return null;
  if (data.user.emailVerified) {
    await query("UPDATE profiles SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1", [data.user.id]);
  }
  const { rows } = await query("SELECT id,email,role,account_status,full_name,student_id,department,academic_year,bio,email_verified_at,status_note,is_demo,leaderboard_opt_out FROM users WHERE id=$1", [data.user.id]);
  return rows[0] || null;
}

export async function requireUser({ approved = false, admin = false } = {}) {
  const user = await getSession();
  if (!user) return { error: "Sign in to continue.", status: 401 };
  if (admin && user.role !== "admin") return { error: "Administrator access required.", status: 403 };
  if (user.role === "student" && user.account_status === "suspended") return { error: "Your account is suspended. Please contact the administrator.", status: 403 };
  if (approved && user.role === "student" && process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.email_verified_at) return { error: "Verify your email address before using this feature.", status: 403, accountStatus: user.account_status };
  if (approved && user.role === "student" && user.account_status !== "approved") return { error: "Your account is awaiting administrator approval. You can explore SkillSwap while we review your profile.", status: 403, accountStatus: user.account_status };
  return { user };
}

export function userView(user) {
  return user;
}
