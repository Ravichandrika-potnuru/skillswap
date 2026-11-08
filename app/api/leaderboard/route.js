import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { levelForCredits } from "@/lib/credits";
import { fail, json } from "@/lib/http";

const filters = ["overall", "learning", "teaching", "monthly", "all_time"];

export async function GET(request) {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  if (auth.user.role !== "student" || auth.user.account_status !== "approved") return fail("The leaderboard is available to approved students.", 403);

  const params = new URL(request.url).searchParams;
  const scope = params.get("scope") === "demo" && process.env.ENABLE_DEMO_ACCOUNTS === "true" ? "demo" : "real";
  const filter = filters.includes(params.get("filter")) ? params.get("filter") : "overall";
  const department = (params.get("department") || "").trim() || null;
  const includeDemos = scope === "demo";
  const totals = `WITH totals AS (
    SELECT p.id,p.full_name,p.department,p.is_demo,
      COALESCE(SUM(c.amount),0)::int AS credits,
      COALESCE(SUM(c.amount) FILTER (WHERE c.activity_type='learning' AND c.transaction_type='earning'),0)::int AS learning_credits,
      COALESCE(SUM(c.amount) FILTER (WHERE c.activity_type='teaching' AND c.transaction_type='earning'),0)::int AS teaching_credits,
      COUNT(c.id) FILTER (WHERE c.activity_type='learning' AND c.transaction_type='earning')::int AS learning_contributions,
      COUNT(c.id) FILTER (WHERE c.activity_type='teaching' AND c.transaction_type='earning')::int AS teaching_contributions,
      COALESCE(SUM(c.amount) FILTER (WHERE c.created_at>=date_trunc('month',now()) AND c.transaction_type='earning'),0)::int AS monthly_credits
    FROM profiles p LEFT JOIN credit_transactions c ON c.user_id=p.id
    WHERE p.role='student' AND p.account_status='approved' AND p.leaderboard_opt_out=false
      AND p.is_demo=$1 AND ($3::text IS NULL OR p.department=$3)
    GROUP BY p.id
  ), scored AS (
    SELECT *,CASE $2 WHEN 'learning' THEN learning_credits WHEN 'teaching' THEN teaching_credits WHEN 'monthly' THEN monthly_credits ELSE credits END AS score
    FROM totals
  ), ranked AS (
    SELECT *,RANK() OVER (ORDER BY score DESC) AS rank FROM scored
  )`;
  const values = [includeDemos, filter, department];
  const [leaders, summary, current, departments] = await Promise.all([
    query(`${totals} SELECT id,full_name,department,is_demo,credits,learning_credits,teaching_credits,learning_contributions,teaching_contributions,monthly_credits,score,rank
      FROM ranked ORDER BY score DESC,full_name ASC LIMIT 100`, values),
    query(`${totals} SELECT COUNT(*)::int AS total_students,COALESCE(MAX(score),0)::int AS highest_score FROM scored`, values),
    query(`${totals} SELECT id,rank,score,credits FROM ranked WHERE id=$4 LIMIT 1`, [...values, auth.user.id]),
    query("SELECT DISTINCT department FROM profiles WHERE role='student' AND account_status='approved' AND leaderboard_opt_out=false AND is_demo=$1 AND department<>'' ORDER BY department", [includeDemos]),
  ]);
  const students = leaders.rows.map((row) => ({ ...row, level: levelForCredits(row.credits) }));
  const userRank = current.rows[0] ? { ...current.rows[0], level: levelForCredits(current.rows[0].credits) } : null;
  return json({
    students,
    userRank,
    summary: summary.rows[0],
    departments: departments.rows.map((row) => row.department),
    scope,
    filter,
    department,
    demoLabel: scope === "demo" ? "Demo Community" : null,
  });
}
