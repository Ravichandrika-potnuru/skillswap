import { getPool, query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bodyOf, fail, json } from "@/lib/http";
import { sendWorkflowEmail, workflowUrl } from "@/lib/email";

const transitions = {
  accept: { from: "pending", actor: "receiver_id", to: "accepted", type: "swap_accepted" },
  reject: { from: "pending", actor: "receiver_id", to: "rejected", type: "swap_rejected" },
  cancel: { from: "pending", actor: "sender_id", to: "cancelled", type: "swap_cancelled" },
};

async function recordEarning(client, userId, amount, activityType, description, swapId) {
  await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id)
    VALUES($1,$2,'earning',$3,$4,'exchange',$5) ON CONFLICT DO NOTHING`, [userId, amount, activityType, description, swapId]);
}

export async function PATCH(request, { params }) {
  const auth = await requireUser({ approved: true });
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  const body = await bodyOf(request);
  const client = await getPool().connect();
  let swap;
  let recipientIds = [];
  let nextStatus;
  let finalCompletion = false;
  let confirmationOnly = false;
  let emailKind;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM swap_requests WHERE id=$1 FOR UPDATE", [id]);
    swap = rows[0];
    if (!swap) { await client.query("ROLLBACK"); return fail("Exchange not found.", 404); }

    if (body.action === "complete") {
      if (swap.status !== "accepted" || ![swap.sender_id, swap.receiver_id].includes(auth.user.id)) {
        await client.query("ROLLBACK");
        return fail("Only participants in an accepted exchange can confirm completion.", 403);
      }
      const senderActing = auth.user.id === swap.sender_id;
      const alreadyConfirmed = senderActing ? swap.sender_completed_at : swap.receiver_completed_at;
      if (alreadyConfirmed) { await client.query("ROLLBACK"); return fail("You have already confirmed; the exchange is waiting for your partner.", 409); }
      finalCompletion = Boolean(senderActing ? swap.receiver_completed_at : swap.sender_completed_at);
      confirmationOnly = !finalCompletion;
      nextStatus = finalCompletion ? "completed" : "accepted";
      await client.query(`UPDATE swap_requests SET
        sender_completed_at=CASE WHEN sender_id=$2 THEN NOW() ELSE sender_completed_at END,
        receiver_completed_at=CASE WHEN receiver_id=$2 THEN NOW() ELSE receiver_completed_at END,
        status=CASE WHEN $3 THEN 'completed' ELSE status END,
        completed_at=CASE WHEN $3 THEN NOW() ELSE completed_at END,
        updated_at=NOW() WHERE id=$1`, [id, auth.user.id, finalCompletion]);
      const otherId = senderActing ? swap.receiver_id : swap.sender_id;
      if (finalCompletion) {
        for (const userId of [swap.sender_id, swap.receiver_id]) {
          await recordEarning(client, userId, 50, "learning", "Completed a learning contribution", id);
          await recordEarning(client, userId, 40, "teaching", "Completed a teaching contribution", id);
          await recordEarning(client, userId, 10, "mutual_completion", "Both participants confirmed the exchange", id);
          await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id)
            VALUES($1,20,'earning','first_exchange','Completed the first skill exchange','exchange',$2) ON CONFLICT DO NOTHING`, [userId, id]);
        }
        recipientIds = [swap.sender_id, swap.receiver_id];
        await client.query(`INSERT INTO notifications(user_id,type,title,body,related_swap_id,is_demo)
          SELECT p.id,'exchange_completed','Exchange completed','Both participants confirmed this exchange. SkillSwap Credits were added to your history.',$1,$2
          FROM profiles p WHERE p.id=ANY($3::uuid[])`, [id, swap.is_demo, recipientIds]);
        emailKind = "exchangeCompleted";
      } else {
        recipientIds = [otherId];
        await client.query(`INSERT INTO notifications(user_id,type,title,body,related_swap_id,is_demo)
          VALUES($1,'exchange_confirmation_needed','Completion confirmation needed','Your partner confirmed this exchange. Confirm it too to complete the exchange and earn credits.',$2,$3)`, [otherId, id, swap.is_demo]);
      }
    } else {
      const rule = transitions[body.action];
      if (!rule) { await client.query("ROLLBACK"); return fail("Choose a supported exchange action."); }
      if (swap[rule.actor] !== auth.user.id || swap.status !== rule.from) {
        await client.query("ROLLBACK"); return fail("This action is not allowed for the current exchange state.", 403);
      }
      nextStatus = rule.to;
      const { rows: updated } = await client.query(`UPDATE swap_requests SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *`, [nextStatus, id]);
      swap = updated[0];
      const recipient = auth.user.id === swap.sender_id ? swap.receiver_id : swap.sender_id;
      recipientIds = [recipient];
      const title = { accepted: "Swap request accepted", rejected: "Swap request declined", cancelled: "Swap request cancelled" }[nextStatus];
      await client.query(`INSERT INTO notifications(user_id,type,title,body,related_swap_id,is_demo)
        VALUES($1,$2,$3,$4,$5,$6)`, [recipient, transitions[body.action].type, title, `${auth.user.full_name} ${nextStatus} the exchange.`, id, swap.is_demo]);
      emailKind = "swapStatus";
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }

  if (!confirmationOnly && emailKind) {
    const { rows } = await query("SELECT email,full_name FROM profiles WHERE id=ANY($1::uuid[]) AND is_demo=false", [recipientIds]);
    await Promise.all(rows.map((person) => sendWorkflowEmail(emailKind, person.email,
      emailKind === "exchangeCompleted"
        ? [person.full_name, "exchange", workflowUrl("/my-exchanges", "")]
        : [person.full_name, "the requested skill", body.action, workflowUrl("/my-exchanges", "")]).catch(() => {})));
  }
  return json({ ok: true, status: nextStatus, confirmationRequired: confirmationOnly, creditsPerParticipant: finalCompletion ? 100 : 0 });
}
