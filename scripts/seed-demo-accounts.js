import nextEnv from "@next/env";
import { createAuthClient } from "@neon/auth";
import { sql } from "drizzle-orm";
import { getDb, getPool } from "../lib/db.js";

nextEnv.loadEnvConfig(process.cwd());

if (process.env.ENABLE_DEMO_ACCOUNTS !== "true") {
  throw new Error("Demo seeding is disabled. Set ENABLE_DEMO_ACCOUNTS=true in the development environment.");
}
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_ACCOUNTS_IN_PRODUCTION !== "true") {
  throw new Error("Demo seeding is blocked in production. A separate administrative production override is required.");
}

const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.BETTER_AUTH_URL;
if (!baseUrl) throw new Error("Set NEON_AUTH_BASE_URL or BETTER_AUTH_URL.");
const auth = createAuthClient(baseUrl);
const db = getDb();

async function ensureIdentity(email, password, name) {
  if (!email || !password) throw new Error("Demo email and password environment variables are required.");
  let { rows } = await db.execute(sql`SELECT id FROM neon_auth."user" WHERE lower(email)=${email.toLowerCase()} LIMIT 1`);
  if (rows[0]) return rows[0].id;

  const result = await auth.signUp.email({ email: email.toLowerCase(), password, name });
  if (result.error) {
    ({ rows } = await db.execute(sql`SELECT id FROM neon_auth."user" WHERE lower(email)=${email.toLowerCase()} LIMIT 1`));
    if (!rows[0]) throw new Error(`Neon Auth could not create a demo identity: ${result.error.message || "unknown auth error"}`);
    return rows[0].id;
  }
  return result.data?.user?.id;
}

async function ensureProfile({ id, email, name, role, department = "", academicYear = "", bio = "" }) {
  if (!id) {
    const result = await db.execute(sql`SELECT id FROM neon_auth."user" WHERE lower(email)=${email.toLowerCase()} LIMIT 1`);
    id = result.rows[0]?.id;
  }
  if (!id) throw new Error("Neon Auth created no user ID for a demo account.");
  await db.execute(sql`
    INSERT INTO profiles (id,email,role,account_status,full_name,department,academic_year,bio)
    VALUES (${id},${email.toLowerCase()},${role},'approved',${name},${department},${academicYear},${bio})
    ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, account_status='approved', email=EXCLUDED.email
  `);
  return id;
}

try {
  const adminId = await ensureIdentity(process.env.DEMO_ADMIN_EMAIL, process.env.DEMO_ADMIN_PASSWORD, "SkillSwap Administrator");
  await ensureProfile({ id: adminId, email: process.env.DEMO_ADMIN_EMAIL, name: "SkillSwap Administrator", role: "admin" });

  const studentId = await ensureIdentity(process.env.DEMO_STUDENT_EMAIL, process.env.DEMO_STUDENT_PASSWORD, "Aarav Mehta");
  await ensureProfile({
    id: studentId,
    email: process.env.DEMO_STUDENT_EMAIL,
    name: "Aarav Mehta",
    role: "student",
    department: "Computer Science",
    academicYear: "Year 2",
    bio: "I enjoy building useful web apps and helping classmates get started with programming.",
  });

  const categories = ["Programming", "Web Development", "Design and UI/UX"];
  for (const name of categories) {
    await db.execute(sql`INSERT INTO skill_categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`);
  }
  const skillRows = [
    ["JavaScript Fundamentals", "Programming", "intermediate", "offered", "Demo listing: practical JavaScript basics, functions, arrays, and debugging."],
    ["React Interfaces", "Web Development", "intermediate", "offered", "Demo listing: reusable components, hooks, and responsive page structure."],
    ["UI Wireframing", "Design and UI/UX", "beginner", "wanted", "Demo listing: looking to learn layout planning and low fidelity wireframes."],
  ];
  for (const [name, category, level, skillType, description] of skillRows) {
    await db.execute(sql`
      INSERT INTO skills (user_id,category_id,name,description,level,skill_type)
      SELECT ${studentId}, id, ${name}, ${description}, ${level}, ${skillType}
      FROM skill_categories WHERE name=${category}
      ON CONFLICT (user_id,name,skill_type) DO NOTHING
    `);
  }

  console.log("Demo administrator and student identities are ready; demo profile and skill seed is complete.");
} finally {
  await getPool().end();
}
