import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { neonAuth } from "@/lib/neon-auth";
import { fail,json } from "@/lib/http";
export async function POST(_request,{params}){
  const auth=await requireUser({admin:true});if(auth.error)return fail(auth.error,auth.status);const {id}=await params;
  const {rows}=await query("SELECT id,email,full_name FROM users WHERE id=$1 AND role='student'",[id]);if(!rows[0])return fail("Student account not found.",404);
  const {error}=await neonAuth.requestPasswordReset({body:{email:rows[0].email,redirectTo:`${process.env.APP_URL||"http://localhost:3000"}/reset-password`}});
  if(error)return fail("Password reset could not be requested. Check Neon Auth email delivery settings.",502);
  await query("INSERT INTO audit_log(actor_id,target_user_id,action,details) VALUES($1,$2,'admin_password_reset_requested',$3)",[auth.user.id,id,JSON.stringify({email_sent:true})]);
  return json({message:"Password reset requested through Neon Auth. The student will receive a link if email delivery is configured."});
}
