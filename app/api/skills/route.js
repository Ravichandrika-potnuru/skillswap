import { getPool, query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bodyOf, fail, json, levels } from "@/lib/http";
import { levelForCredits } from "@/lib/credits";
export async function GET(request) {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  if (auth.user.account_status === "rejected") return fail("Your account is not active. Contact the administrator for assistance.", 403);
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") || "").trim();
  const rating = Number(params.get("rating"));
  const minimumRating = params.get("rating") && Number.isFinite(rating) ? rating : null;
  const values = [auth.user.id, `%${q}%`, params.get("category") || null, params.get("level") || null, params.get("department") || null, params.get("year") || null, "offered", minimumRating];
  const { rows } = await query(`SELECT s.id,s.name,s.description,s.level,s.skill_type,s.is_active,s.category_id,c.name AS category,
      u.id AS user_id,u.full_name,u.department,u.academic_year,u.is_demo,
      COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.reviewed_user_id=u.id),0)::numeric(3,2) AS rating,
      (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewed_user_id=u.id) AS review_count,
      (SELECT COUNT(*)::int FROM swap_requests sw WHERE sw.status='completed' AND (sw.sender_id=u.id OR sw.receiver_id=u.id)) AS completed_exchanges,
      COALESCE((SELECT SUM(ct.amount)::int FROM credit_transactions ct WHERE ct.user_id=u.id),0) AS credits
    FROM skills s JOIN users u ON u.id=s.user_id LEFT JOIN skill_categories c ON c.id=s.category_id
    WHERE s.skill_type=$7 AND s.is_active=true AND u.account_status='approved' AND ($1::uuid IS NULL OR u.id<>$1)
      AND ($2='%%' OR s.name ILIKE $2 OR s.description ILIKE $2 OR u.full_name ILIKE $2 OR c.name ILIKE $2)
      AND ($3::uuid IS NULL OR s.category_id=$3) AND ($4::text IS NULL OR s.level=$4)
      AND ($5::text IS NULL OR u.department ILIKE $5) AND ($6::text IS NULL OR u.academic_year=$6)
      AND ($8::numeric IS NULL OR COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.reviewed_user_id=u.id),0)>=$8)
    ORDER BY s.created_at DESC LIMIT 100`, values);
  const { rows: categories } = await query("SELECT id,name FROM skill_categories WHERE is_active ORDER BY name");
  const { rows: departments } = await query("SELECT DISTINCT department FROM users WHERE role='student' AND account_status='approved' AND department<>'' ORDER BY department");
  return json({ skills: rows.map((skill) => ({ ...skill, student_level: levelForCredits(skill.credits) })), categories, departments: departments.map((row) => row.department) });
}export async function POST(request) {
  const auth=await requireUser({approved:true}); if(auth.error) return fail(auth.error,auth.status,{accountStatus:auth.accountStatus});
  const b=await bodyOf(request),name=String(b.name||"").trim(),description=String(b.description||"").trim(),type=b.skillType;
  if(name.length<2||name.length>80||description.length>500||!levels.includes(b.level)||!['offered','wanted'].includes(type)) return fail("Check the skill name, description, type, and proficiency level.");
  const client=await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM profiles WHERE id=$1 FOR UPDATE",[auth.user.id]);
    const {rows}=await client.query("INSERT INTO skills(user_id,category_id,name,description,level,skill_type) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[auth.user.id,b.categoryId||null,name,description,b.level,type]);
    if(type==='offered') await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id)
      SELECT $1,10,'earning','first_skill','Published the first teaching skill','skill',$2
      WHERE NOT EXISTS(SELECT 1 FROM credit_transactions WHERE user_id=$1 AND activity_type='first_skill' AND transaction_type='earning')
      ON CONFLICT DO NOTHING`,[auth.user.id,rows[0].id]);
    await client.query("COMMIT");
    return json({skill:rows[0]},201);
  } catch(error){await client.query("ROLLBACK");if(error.code==='23505')return fail("You already have a skill with that name in this list.",409);throw error;}
  finally{client.release();}
}
