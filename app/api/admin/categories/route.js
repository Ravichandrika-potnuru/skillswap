import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bodyOf, fail, json } from "@/lib/http";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const validName = (value) => typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 80;

export async function GET() {
  const auth = await requireUser({ admin: true });
  if (auth.error) return fail(auth.error, auth.status, {}, noStore);
  try {
    const { rows } = await query(`
      SELECT c.id, c.name, c.description, c.is_active, c.created_at,
        COUNT(s.id)::int AS skills_count,
        COUNT(s.id) FILTER (WHERE s.is_active)::int AS active_skills_count
      FROM skill_categories c
      LEFT JOIN skills s ON s.category_id = c.id
      GROUP BY c.id
      ORDER BY c.is_active DESC, LOWER(c.name), c.created_at
    `);
    return json({ categories: rows }, 200, noStore);
  } catch (error) {
    console.error("Admin category listing failed:", error?.code || error?.name || "unknown database error");
    return fail("Unable to load categories right now. Please retry.", 500, {}, noStore);
  }
}

export async function POST(request) {
  const auth = await requireUser({ admin: true });
  if (auth.error) return fail(auth.error, auth.status, {}, noStore);
  const body = await bodyOf(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!validName(name)) return fail("Category name must be 2–80 characters.", 400, {}, noStore);
  if (description.length > 500) return fail("Description must be 500 characters or fewer.", 400, {}, noStore);
  try {
    const { rows: duplicates } = await query("SELECT id FROM skill_categories WHERE LOWER(name)=LOWER($1) LIMIT 1", [name]);
    if (duplicates.length) return fail("A category with that name already exists.", 409, {}, noStore);
    const { rows } = await query(
      "INSERT INTO skill_categories(name,description) VALUES($1,$2) RETURNING id,name,description,is_active,created_at",
      [name, description],
    );
    return json({ category: { ...rows[0], skills_count: 0, active_skills_count: 0 } }, 201, noStore);
  } catch (error) {
    if (error?.code === "23505") return fail("A category with that name already exists.", 409, {}, noStore);
    console.error("Admin category creation failed:", error?.code || error?.name || "unknown database error");
    return fail("Unable to create the category right now.", 500, {}, noStore);
  }
}
