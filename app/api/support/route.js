import { requireUser } from "@/lib/auth";
import { fail,json } from "@/lib/http";
export async function GET(){const auth=await requireUser();if(auth.error)return fail(auth.error,auth.status);return json({contactEmail:process.env.ADMIN_CONTACT_EMAIL||null});}
