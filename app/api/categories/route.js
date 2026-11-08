import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bodyOf, fail, json } from "@/lib/http";
export async function GET(){const {rows}=await query("SELECT id,name,description FROM skill_categories WHERE is_active ORDER BY name");return json({categories:rows});}
export async function POST(request){const auth=await requireUser({admin:true});if(auth.error)return fail(auth.error,auth.status);const b=await bodyOf(request),name=String(b.name||"").trim();if(name.length<2||name.length>80)return fail("Category name must be 2–80 characters.");try{const {rows}=await query("INSERT INTO skill_categories(name,description) VALUES($1,$2) RETURNING *",[name,String(b.description||"").trim()]);return json({category:rows[0]},201);}catch(e){if(e.code==='23505')return fail("That category already exists.",409);throw e;}}
