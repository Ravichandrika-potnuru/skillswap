import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail,json } from "@/lib/http";
export async function GET(){const auth=await requireUser();if(auth.error)return fail(auth.error,auth.status);const {rows}=await query("SELECT s.*,c.name AS category FROM skills s LEFT JOIN skill_categories c ON c.id=s.category_id WHERE s.user_id=$1 ORDER BY s.skill_type,s.created_at DESC",[auth.user.id]);return json({skills:rows});}
