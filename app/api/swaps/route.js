import { getPool, query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bodyOf, fail, json } from "@/lib/http";
import { sendWorkflowEmail, workflowUrl } from "@/lib/email";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { rows: swaps } = await query(`SELECT sw.*,sender.full_name AS sender_name,receiver.full_name AS receiver_name,
    rs.name AS requested_skill,os.name AS offered_skill,rs.user_id AS requested_owner,os.user_id AS offered_owner
    ,EXISTS(SELECT 1 FROM reviews r WHERE r.swap_id=sw.id AND r.reviewer_id=$1) AS reviewed_by_me
    ,EXISTS(SELECT 1 FROM reviews r WHERE r.swap_id=sw.id AND r.reviewer_id=CASE WHEN sw.sender_id=$1 THEN sw.receiver_id ELSE sw.sender_id END) AS reviewed_by_partner
    ,COALESCE((SELECT SUM(c.amount)::int FROM credit_transactions c WHERE c.user_id=$1 AND c.source_type='exchange' AND c.source_id=sw.id),0) AS credits_earned
    FROM swap_requests sw JOIN profiles sender ON sender.id=sw.sender_id JOIN profiles receiver ON receiver.id=sw.receiver_id
    JOIN skills rs ON rs.id=sw.requested_skill_id JOIN skills os ON os.id=sw.offered_skill_id
    WHERE sw.sender_id=$1 OR sw.receiver_id=$1 ORDER BY sw.updated_at DESC`, [auth.user.id]);
  const { rows: mySkills } = await query("SELECT id,name FROM skills WHERE user_id=$1 AND skill_type='offered' AND is_active ORDER BY name", [auth.user.id]);
  return json({ swaps, mySkills });
}

export async function POST(request) {
  const auth = await requireUser({ approved: true });
  if (auth.error) return fail(auth.error, auth.status);
  const body = await bodyOf(request);
  const { rows: target } = await query(`SELECT s.id,s.user_id,s.name FROM skills s JOIN profiles p ON p.id=s.user_id
    WHERE s.id=$1 AND s.skill_type='offered' AND s.is_active AND p.account_status='approved'`, [body.requestedSkillId]);
  const { rows: offered } = await query("SELECT id,name FROM skills WHERE id=$1 AND user_id=$2 AND skill_type='offered' AND is_active", [body.offeredSkillId, auth.user.id]);
  if (!target[0] || !offered[0]) return fail("Choose an available skill and one of your own active teaching skills.");
  if (target[0].user_id === auth.user.id) return fail("You cannot request a swap from yourself.");
  const client = await getPool().connect();
  let swap;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`INSERT INTO swap_requests(sender_id,receiver_id,requested_skill_id,offered_skill_id,message,is_demo)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [auth.user.id, target[0].user_id, target[0].id, offered[0].id, String(body.message || "").slice(0, 500), Boolean(auth.user.is_demo)]);
    swap = rows[0];
    await client.query(`INSERT INTO notifications(user_id,type,title,body,related_swap_id,is_demo)
      VALUES($1,'swap_request','New swap request',$2,$3,$4)`, [swap.receiver_id, `${auth.user.full_name} wants to learn ${target[0].name} and can teach ${offered[0].name}.`, swap.id, swap.is_demo]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return fail("An active request for these skills already exists.", 409);
    throw error;
  } finally { client.release(); }
  const { rows: receiver } = await query("SELECT email,full_name FROM profiles WHERE id=$1 AND is_demo=false", [swap.receiver_id]);
  if (receiver[0]) await sendWorkflowEmail("swapRequest", receiver[0].email, [receiver[0].full_name, auth.user.full_name, target[0].name, workflowUrl("/swap-requests", "")]).catch(() => {});
  return json({ swap }, 201);
}
