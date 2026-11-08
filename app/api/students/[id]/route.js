import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCreditSummary } from "@/lib/credits";
import { fail, json } from "@/lib/http";

export async function GET(_request, { params }) {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(`SELECT id,full_name,department,academic_year,bio,account_status,is_demo,created_at
      FROM profiles WHERE id=$1 AND role='student' AND (account_status='approved' OR id=$2)`, [id, auth.user.id]);
    const profile = rows[0];
    if (!profile) return fail("Student profile not found.", 404);
    const [{ rows: skills }, { rows: reviews }, { rows: rating }] = await Promise.all([
      client.query(`SELECT s.id,s.name,s.description,s.level,s.skill_type,c.name AS category FROM skills s LEFT JOIN skill_categories c ON c.id=s.category_id WHERE s.user_id=$1 AND s.is_active=true ORDER BY s.skill_type,s.name`, [id]),
      client.query(`SELECT r.id,r.rating,r.comment,r.created_at,u.full_name AS reviewer_name,rs.name AS requested_skill,os.name AS offered_skill
        FROM reviews r JOIN profiles u ON u.id=r.reviewer_id JOIN swap_requests sw ON sw.id=r.swap_id
        JOIN skills rs ON rs.id=sw.requested_skill_id JOIN skills os ON os.id=sw.offered_skill_id
        WHERE r.reviewed_user_id=$1 AND sw.status='completed' ORDER BY r.created_at DESC LIMIT 20`, [id]),
      client.query(`SELECT COUNT(*)::int AS count,COALESCE(AVG(rating),0)::numeric(3,2) AS average FROM reviews WHERE reviewed_user_id=$1`, [id]),
    ]);
    const completed = await client.query(`SELECT COUNT(*)::int AS count FROM swap_requests WHERE status='completed' AND (sender_id=$1 OR receiver_id=$1)`, [id]);
    const history = await client.query(`SELECT sw.id,sw.completed_at,
        partner.full_name AS other_student,
        rs.name AS requested_skill,os.name AS offered_skill,
        EXISTS(SELECT 1 FROM reviews r WHERE r.swap_id=sw.id AND r.reviewer_id=$1) AS reviewed_by_me,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.swap_id=sw.id) AS review_count,
        COALESCE((SELECT SUM(c.amount)::int FROM credit_transactions c WHERE c.user_id=$1 AND c.source_type='exchange' AND c.source_id=sw.id),0) AS credits_earned
      FROM swap_requests sw
      JOIN profiles partner ON partner.id=CASE WHEN sw.sender_id=$1 THEN sw.receiver_id ELSE sw.sender_id END
      JOIN skills rs ON rs.id=sw.requested_skill_id JOIN skills os ON os.id=sw.offered_skill_id
      WHERE sw.status='completed' AND (sw.sender_id=$1 OR sw.receiver_id=$1)
      ORDER BY sw.completed_at DESC LIMIT 10`, [id]);
    const summary = await getCreditSummary(client, id);
    return json({ profile: { ...profile, average_rating: rating[0].average, review_count: rating[0].count, completed_exchanges: completed.rows[0].count }, skills, reviews, history: history.rows, summary });
  } finally { client.release(); }
}
