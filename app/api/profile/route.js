import { getPool, query } from "@/lib/db";
import { requireUser, userView } from "@/lib/auth";
import { bodyOf, fail, json } from "@/lib/http";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { rows } = await query(`SELECT u.id,u.full_name,u.student_id,u.department,u.academic_year,u.bio,u.account_status,u.created_at,u.is_demo,u.leaderboard_opt_out,
    COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.reviewed_user_id=u.id),0)::numeric(3,2) AS average_rating,
    (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewed_user_id=u.id) AS review_count,
    (SELECT COUNT(*)::int FROM skills s WHERE s.user_id=u.id AND s.skill_type='offered' AND s.is_active) AS skills_offered,
    (SELECT COUNT(*)::int FROM skills s WHERE s.user_id=u.id AND s.skill_type='wanted' AND s.is_active) AS skills_wanted,
    (SELECT COUNT(*)::int FROM swap_requests sw WHERE (sw.sender_id=u.id OR sw.receiver_id=u.id) AND sw.status='completed') AS completed_exchanges
    FROM users u WHERE u.id=$1`, [auth.user.id]);
  const { rows: skills } = await query(`SELECT s.id,s.name,s.description,s.level,s.skill_type,c.name AS category FROM skills s
    LEFT JOIN skill_categories c ON c.id=s.category_id WHERE s.user_id=$1 AND s.is_active ORDER BY s.skill_type,s.name`, [auth.user.id]);
  const { rows: history } = await query(`SELECT sw.id,sw.completed_at,partner.full_name AS other_student,rs.name AS requested_skill,os.name AS offered_skill,
      EXISTS(SELECT 1 FROM reviews r WHERE r.swap_id=sw.id AND r.reviewer_id=$1) AS reviewed_by_me,
      (SELECT COUNT(*)::int FROM reviews r WHERE r.swap_id=sw.id) AS review_count,
      COALESCE((SELECT SUM(c.amount)::int FROM credit_transactions c WHERE c.user_id=$1 AND c.source_type='exchange' AND c.source_id=sw.id),0) AS credits_earned
    FROM swap_requests sw JOIN profiles partner ON partner.id=CASE WHEN sw.sender_id=$1 THEN sw.receiver_id ELSE sw.sender_id END
    JOIN skills rs ON rs.id=sw.requested_skill_id JOIN skills os ON os.id=sw.offered_skill_id
    WHERE sw.status='completed' AND (sw.sender_id=$1 OR sw.receiver_id=$1) ORDER BY sw.completed_at DESC LIMIT 10`, [auth.user.id]);
  return json({ profile: rows[0], skills, history });
}

export async function PATCH(request) {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await bodyOf(request);
  const fullName = String(body.fullName || "").trim();
  const department = String(body.department || "").trim();
  const academicYear = String(body.academicYear || "").trim();
  const bio = String(body.bio || "").trim();
  if (fullName.length < 2 || !department || !academicYear || bio.length > 600) return fail("Name, department, and academic year are required. Bio must be under 600 characters.");
  const optOut = body.leaderboardOptOut === true || body.leaderboardOptOut === "true" || body.leaderboardOptOut === "on";
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`UPDATE profiles SET full_name=$1,student_id=$2,department=$3,academic_year=$4,bio=$5,
      leaderboard_opt_out=$6,updated_at=NOW() WHERE id=$7
      RETURNING id,email,role,account_status,full_name,student_id,department,academic_year,bio,leaderboard_opt_out`,
    [fullName, body.studentId || null, department, academicYear, bio, optOut, auth.user.id]);
    if (auth.user.role === "student") {
      await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id)
        VALUES($1,15,'earning','profile_complete','Completed the required student profile','profile',$1) ON CONFLICT DO NOTHING`, [auth.user.id]);
    }
    await client.query("COMMIT");
    return json({ user: userView(rows[0]) });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return fail("That student ID is already in use.", 409);
    throw error;
  } finally { client.release(); }
}
