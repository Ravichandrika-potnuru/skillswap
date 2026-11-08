import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bodyOf, fail, json, levels } from "@/lib/http";
export async function GET(_request,{params}) { const {id}=await params; const {rows}=await query("SELECT s.id,s.name,s.description,s.level,s.skill_type,s.category_id,c.name AS category,u.id AS user_id,u.full_name,u.department,u.academic_year,u.bio FROM skills s JOIN users u ON u.id=s.user_id LEFT JOIN skill_categories c ON c.id=s.category_id WHERE s.id=$1 AND s.skill_type='offered' AND s.is_active=TRUE AND u.account_status='approved'",[id]); return rows[0]?json({skill:rows[0]}):fail("Skill not found.",404); }
export async function PATCH(request,{params}) {
  const auth=await requireUser({approved:true}); if(auth.error)return fail(auth.error,auth.status); const {id}=await params,b=await bodyOf(request);
  if(b.level&&!levels.includes(b.level))return fail("Choose a valid skill level.");
  const {rows}=await query("UPDATE skills SET name=COALESCE($1,name),description=COALESCE($2,description),level=COALESCE($3,level),category_id=CASE WHEN $4::boolean THEN $5::uuid ELSE category_id END,is_active=COALESCE($6,is_active),updated_at=NOW() WHERE id=$7 AND user_id=$8 RETURNING *",[b.name?String(b.name).trim():null,b.description===undefined?null:String(b.description).trim(),b.level||null,b.categoryId!==undefined,b.categoryId||null,b.isActive===undefined?null:!!b.isActive,id,auth.user.id]);
  return rows[0]?json({skill:rows[0]}):fail("Skill not found or not yours.",404);
}
export async function DELETE(_request,{params}) { const auth=await requireUser({approved:true}); if(auth.error)return fail(auth.error,auth.status); const {id}=await params; const {rowCount}=await query("DELETE FROM skills WHERE id=$1 AND user_id=$2",[id,auth.user.id]); return rowCount?json({ok:true}):fail("Skill not found or not yours.",404); }
