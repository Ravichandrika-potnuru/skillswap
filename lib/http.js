import { NextResponse } from "next/server";

export const json = (data, status = 200, headers) => NextResponse.json(data, { status, headers });
export const fail = (message, status = 400, extra = {}, headers) => json({ error: message, ...extra }, status, headers);
export async function bodyOf(request) {
  try { return await request.json(); } catch { return {}; }
}
export const emailSchema = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const levels = ["beginner", "intermediate", "advanced", "expert"];
