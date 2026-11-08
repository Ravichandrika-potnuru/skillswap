import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { neonAuth } from "@/lib/neon-auth";
import { profiles } from "@/database/schema";
import { bodyOf, fail, json } from "@/lib/http";

export async function POST(request) {
  const { data, error } = await neonAuth.getSession();
  if (error || !data?.user?.id || !data.user.email) return fail("Sign in to create your SkillSwap profile.", 401);
  const body = await bodyOf(request);
  const fullName = String(body.fullName || data.user.name || "").trim();
  const department = String(body.department || "").trim();
  const academicYear = String(body.academicYear || "").trim();
  const bio = String(body.bio || "").trim();
  if (fullName.length < 2 || !department || !academicYear || bio.length > 600) {
    return fail("Enter your name, department, academic year, and a bio under 600 characters.");
  }

  const db = getDb();
  try {
    await db.insert(profiles).values({
      id: data.user.id,
      email: data.user.email.toLowerCase(),
      fullName,
      studentId: String(body.studentId || "").trim() || null,
      department,
      academicYear,
      bio,
      role: "student",
      accountStatus: "pending",
      emailVerifiedAt: data.user.emailVerified ? new Date() : null,
    }).onConflictDoNothing({ target: profiles.id });
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, data.user.id)).limit(1);
    if (!profile) return fail("Your profile could not be created.", 500);
    return json({ user: profile, message: "Account created. You can sign in while an administrator reviews your profile." }, 201);
  } catch (error) {
    if (error.code === "23505") return fail("That student ID is already in use.", 409);
    throw error;
  }
}
