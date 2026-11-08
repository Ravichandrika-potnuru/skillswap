import { createNeonAuth } from "@neon/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.BETTER_AUTH_URL;
const cookieSecret = process.env.BETTER_AUTH_SECRET;

if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL (or BETTER_AUTH_URL) is required.");
if (!cookieSecret || cookieSecret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");

export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: { secret: cookieSecret },
});
