import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCreditSummary, CREDIT_DISCLAIMER } from "@/lib/credits";
import { fail, json } from "@/lib/http";

const ACTIVITY_PAGE_SIZE = 12;

export async function GET(request) {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  if (auth.user.role !== "student") return fail("Student credit information is available to student accounts.", 403);
  const requestedOffset = Number(new URL(request.url).searchParams.get("offset") || 0);
  const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 ? Math.min(requestedOffset, 100000) : 0;
  const client = await getPool().connect();
  try {
    const summary = await getCreditSummary(client, auth.user.id);
    const [{ rows: activity }, { rows: count }] = await Promise.all([
      client.query(`SELECT id,amount,activity_type,transaction_type,description,reason,created_at
        FROM credit_transactions WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`, [auth.user.id, ACTIVITY_PAGE_SIZE, offset]),
      client.query("SELECT COUNT(*)::int AS total FROM credit_transactions WHERE user_id=$1", [auth.user.id]),
    ]);
    const total = count[0].total;
    return json({
      summary,
      activity,
      pagination: { offset, limit: ACTIVITY_PAGE_SIZE, total, hasMore: offset + activity.length < total },
      disclaimer: CREDIT_DISCLAIMER,
    });
  } finally { client.release(); }
}
