import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bodyOf, fail, json } from "@/lib/http";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function PATCH(request, { params }) {
  const auth = await requireUser({ admin: true });
  if (auth.error) return fail(auth.error, auth.status, {}, noStore);
  const { id } = await params;
  if (!isUuid(id)) return fail("Category not found.", 404, {}, noStore);
  const body = await bodyOf(request);
  const name = body.name === undefined ? undefined : (typeof body.name === "string" ? body.name.trim() : "");
  const description = body.description === undefined ? undefined : (typeof body.description === "string" ? body.description.trim() : "");
  if (name !== undefined && (name.length < 2 || name.length > 80)) return fail("Category name must be 2–80 characters.", 400, {}, noStore);
  if (description !== undefined && description.length > 500) return fail("Description must be 500 characters or fewer.", 400, {}, noStore);
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") return fail("Category status must be active or archived.", 400, {}, noStore);
  try {
    if (name !== undefined) {
      const { rows: duplicates } = await query("SELECT id FROM skill_categories WHERE LOWER(name)=LOWER($1) AND id<>$2 LIMIT 1", [name, id]);
      if (duplicates.length) return fail("A category with that name already exists.", 409, {}, noStore);
    }
    const { rows } = await query(
      `UPDATE skill_categories
       SET name=COALESCE($1,name), description=COALESCE($2,description), is_active=COALESCE($3,is_active)
       WHERE id=$4
       RETURNING id,name,description,is_active,created_at`,
      [name ?? null, description ?? null, body.isActive ?? null, id],
    );
    return rows[0] ? json({ category: rows[0] }, 200, noStore) : fail("Category not found.", 404, {}, noStore);
  } catch (error) {
    if (error?.code === "23505") return fail("A category with that name already exists.", 409, {}, noStore);
    console.error("Admin category update failed:", error?.code || error?.name || "unknown database error");
    return fail("Unable to update the category right now.", 500, {}, noStore);
  }
}

export async function DELETE(_request, { params }) {
  const auth = await requireUser({ admin: true });
  if (auth.error) return fail(auth.error, auth.status, {}, noStore);
  const { id } = await params;
  if (!isUuid(id)) return fail("Category not found.", 404, {}, noStore);
  try {
    const { rows } = await query(`
      WITH target AS (SELECT id FROM skill_categories WHERE id=$1 FOR UPDATE),
      usage AS (SELECT COUNT(*)::int AS skills_count FROM skills WHERE category_id=$1)
      DELETE FROM skill_categories c
      USING target t, usage u
      WHERE c.id=t.id AND u.skills_count=0
      RETURNING c.id
    `, [id]);
    if (rows.length) return json({ ok: true }, 200, noStore);
    const { rows: existing } = await query(
      "SELECT c.id, COUNT(s.id)::int AS skills_count FROM skill_categories c LEFT JOIN skills s ON s.category_id=c.id WHERE c.id=$1 GROUP BY c.id",
      [id],
    );
    if (!existing.length) return fail("Category not found.", 404, {}, noStore);
    return fail("This category is still linked to skills. Archive it instead to preserve those relationships.", 409, { skillsCount: existing[0].skills_count }, noStore);
  } catch (error) {
    console.error("Admin category deletion failed:", error?.code || error?.name || "unknown database error");
    return fail("Unable to delete the category right now.", 500, {}, noStore);
  }
}
