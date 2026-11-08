import { authSessionErrorStatus } from "@/lib/auth-errors";
import { getSession, userView } from "@/lib/auth";
import { fail, json } from "@/lib/http";

export async function GET() {
  try {
    const user = await getSession();
    return user
      ? json({ user: userView(user) }, 200, { "Cache-Control": "private, no-store, max-age=0" })
      : fail("Not signed in.", 401, {}, { "Cache-Control": "private, no-store, max-age=0" });
  } catch (error) {
    const code = String(error?.code || error?.name || "unknown").replace(/[^A-Z0-9_-]/gi, "").slice(0, 64);
    const status = authSessionErrorStatus(error);
    console.error(`[auth/me] account lookup failed (${code || "unknown"})`);
    return fail(status === 503 ? "Sign-in is temporarily unavailable. Please try again." : "Unable to load the current account.", status, {}, { "Cache-Control": "private, no-store, max-age=0" });
  }
}
