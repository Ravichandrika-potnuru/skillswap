import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail,json } from "@/lib/http";
export async function GET(){const auth=await requireUser();if(auth.error)return fail(auth.error,auth.status);const {rows}=await query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[auth.user.id]);return json({notifications:rows,unreadCount:rows.filter(n=>!n.read_at).length});}
export async function PATCH(request){const auth=await requireUser();if(auth.error)return fail(auth.error,auth.status);const body=await request.json().catch(()=>({}));if(body.readAll)await query("UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL",[auth.user.id]);else if(body.id)await query("UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND id=$2",[auth.user.id,body.id]);else return fail("Notification ID is required.");return json({ok:true});}
