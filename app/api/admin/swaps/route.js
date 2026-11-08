import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail,json } from "@/lib/http";
export async function GET(){const auth=await requireUser({admin:true});if(auth.error)return fail(auth.error,auth.status);const {rows}=await query("SELECT s.id,s.status,s.message,s.created_at,s.updated_at,a.full_name AS sender_name,b.full_name AS receiver_name,rs.name AS requested_skill,os.name AS offered_skill FROM swap_requests s JOIN users a ON a.id=s.sender_id JOIN users b ON b.id=s.receiver_id JOIN skills rs ON rs.id=s.requested_skill_id JOIN skills os ON os.id=s.offered_skill_id ORDER BY s.created_at DESC LIMIT 300");return json({swaps:rows});}
