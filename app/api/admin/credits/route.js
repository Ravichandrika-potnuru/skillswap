import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCreditSummary } from "@/lib/credits";
import { bodyOf, fail, json } from "@/lib/http";

export async function GET(request) {
  const auth = await requireUser({ admin: true });
  if (auth.error) return fail(auth.error, auth.status);
  const params = new URL(request.url).searchParams;
  const scope = ["all", "demo", "real"].includes(params.get("scope")) ? params.get("scope") : "all";
  const userId = params.get("userId");
  const client = await getPool().connect();
  try {
    const { rows: students } = await client.query(`SELECT p.id,p.full_name,p.department,p.academic_year,p.account_status,p.is_demo,
      COALESCE(SUM(c.amount),0)::int AS credits,
      COALESCE(SUM(c.amount) FILTER (WHERE c.activity_type='learning' AND c.transaction_type='earning'),0)::int AS learning_credits,
      COALESCE(SUM(c.amount) FILTER (WHERE c.activity_type='teaching' AND c.transaction_type='earning'),0)::int AS teaching_credits,
      COUNT(c.id) FILTER (WHERE c.activity_type='learning' AND c.transaction_type='earning')::int AS learning_contributions,
      COUNT(c.id) FILTER (WHERE c.activity_type='teaching' AND c.transaction_type='earning')::int AS teaching_contributions
      FROM profiles p LEFT JOIN credit_transactions c ON c.user_id=p.id
      WHERE p.role='student' AND ($1='all' OR p.is_demo=($1='demo'))
      GROUP BY p.id ORDER BY p.is_demo DESC,credits DESC,p.full_name LIMIT 200`, [scope]);
    let detail = null;
    if (userId) {
      const { rows: target } = await client.query("SELECT id,full_name,is_demo,account_status FROM profiles WHERE id=$1 AND role='student'", [userId]);
      if (!target[0]) return fail("Student not found.", 404);
      const summary = await getCreditSummary(client, userId);
      const { rows: transactions } = await client.query(`SELECT id,amount,transaction_type,activity_type,description,source_type,source_id,
        administrator_id,reason,created_at FROM credit_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [userId]);
      const { rows: duplicates } = await client.query(`SELECT activity_type,source_type,source_id,COUNT(*)::int AS count FROM credit_transactions
        WHERE user_id=$1 AND transaction_type='earning' AND source_id IS NOT NULL GROUP BY activity_type,source_type,source_id HAVING COUNT(*)>1`, [userId]);
      detail = { student: target[0], summary, transactions, duplicateEvents: duplicates };
    }
    return json({ students, detail, scope });
  } finally { client.release(); }
}

export async function POST(request) {
  const auth = await requireUser({ admin: true });
  if (auth.error) return fail(auth.error, auth.status);
  const body = await bodyOf(request);
  const userId = String(body.userId || "");
  const amount = Number(body.amount);
  const reason = String(body.reason || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 5000 || reason.length < 8 || reason.length > 500) {
    return fail("Enter a student, an adjustment between 1 and 5,000 credits, and a reason of 8–500 characters.");
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows: admin } = await client.query("SELECT id,role FROM profiles WHERE id=$1 FOR UPDATE", [auth.user.id]);
    if (admin[0]?.role !== "admin") { await client.query("ROLLBACK"); return fail("Administrator access required.", 403); }
    const { rows: target } = await client.query("SELECT id,role FROM profiles WHERE id=$1 FOR UPDATE", [userId]);
    if (target[0]?.role !== "student") { await client.query("ROLLBACK"); return fail("Choose a student account.", 404); }
    const { rows: balance } = await client.query("SELECT COALESCE(SUM(amount),0)::int AS credits FROM credit_transactions WHERE user_id=$1", [userId]);
    if (balance[0].credits + amount < 0) { await client.query("ROLLBACK"); return fail("This adjustment cannot reduce the student below zero credits.", 409); }
    const { rows: created } = await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,administrator_id,reason,metadata)
      VALUES($1,$2,'adjustment','admin_adjustment','Administrator adjustment','admin_adjustment',$3,$4,$5::jsonb) RETURNING id,amount,reason,created_at`,
    [userId, amount, auth.user.id, reason, JSON.stringify({ source: "admin_dashboard" })]);
    await client.query("INSERT INTO audit_log(actor_id,target_user_id,action,details) VALUES($1,$2,'credit_adjustment',$3::jsonb)",
      [auth.user.id, userId, JSON.stringify({ amount, reason, transactionId: created[0].id })]);
    await client.query("COMMIT");
    return json({ transaction: created[0] }, 201);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
