import { neonAuth } from "@/lib/neon-auth";
import { installNeonAuthPinnedFetch } from "@/lib/neon-auth-fetch";

const handlers = neonAuth.handler();

async function forward(request, context, method) {
  installNeonAuthPinnedFetch();
  const response = await handlers[method](request, context);
  if (response.status !== 502) return response;
  const body = await response.clone().json().catch(() => null);
  if (!String(body?.code || "").startsWith("NETWORK_")) return response;
  return Response.json({ error: "Authentication is temporarily unavailable. Please try again." }, { status: 503 });
}

export const GET = (request, context) => forward(request, context, "GET");
export const POST = (request, context) => forward(request, context, "POST");
export const PUT = (request, context) => forward(request, context, "PUT");
export const DELETE = (request, context) => forward(request, context, "DELETE");
export const PATCH = (request, context) => forward(request, context, "PATCH");
