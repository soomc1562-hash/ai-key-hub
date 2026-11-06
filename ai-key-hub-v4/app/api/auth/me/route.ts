import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
try {
const id = await getUserId();

if (!id) {
  return NextResponse.json({ user: null });
}

await ensureSchema();

const result = await db.query(
  "SELECT id, email, role FROM users WHERE id = $1 LIMIT 1",
  [id]
);

const user = result.rows[0] || null;

return NextResponse.json({ user });

} catch (error) {
console.error("Auth me error", error);
return NextResponse.json({ user: null });
}
}
