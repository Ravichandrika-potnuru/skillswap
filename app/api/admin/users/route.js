import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail,json } from "@/lib/http";
export async function GET(request){const auth=await requireUser({admin:true});if(auth.error)return fail(auth.error,auth.status);const p=new URL(request.url).searchParams,q=`%${p.get('q')||''}%`,status=p.get('status');const {rows}=await query("SELECT id,email,full_name,student_id,department,academic_year,bio,account_status,email_verified_at,created_at,is_demo FROM users WHERE role='student' AND (full_name ILIKE $1 OR email ILIKE $1 OR COALESCE(student_id,'') ILIKE $1) AND ($2::text IS NULL OR account_status=$2) ORDER BY CASE account_status WHEN 'pending' THEN 0 ELSE 1 END,created_at DESC LIMIT 200",[q,status]);return json({users:rows});}
