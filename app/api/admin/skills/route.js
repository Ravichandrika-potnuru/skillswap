import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail,json } from "@/lib/http";
export async function GET(){const auth=await requireUser({admin:true});if(auth.error)return fail(auth.error,auth.status);const {rows}=await query("SELECT s.id,s.name,s.description,s.level,s.skill_type,s.is_active,u.full_name,u.email,c.name AS category FROM skills s JOIN users u ON u.id=s.user_id LEFT JOIN skill_categories c ON c.id=s.category_id ORDER BY s.created_at DESC LIMIT 300");return json({skills:rows});}
export async function PATCH(request){const auth=await requireUser({admin:true});if(auth.error)return fail(auth.error,auth.status);const b=await request.json().catch(()=>({}));const {rows}=await query("UPDATE skills SET is_active=$1,updated_at=NOW() WHERE id=$2 RETURNING id,is_active",[!!b.isActive,b.id]);return rows[0]?json({skill:rows[0]}):fail("Skill not found.",404);}
