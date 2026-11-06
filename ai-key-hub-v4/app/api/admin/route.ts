import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
try {
const userId = await getUserId();

if (!userId) {
  return NextResponse.json(
    { error: "Требуется вход." },
    { status: 401 }
  );
}

await ensureSchema();

const [totalResult, todayResult, providerResult] = await Promise.all([
  db.query(
    `SELECT COUNT(*) AS n
     FROM usage_events
     WHERE user_id = $1`,
    [userId]
  ),

  db.query(
    `SELECT COUNT(*) AS n
     FROM usage_events
     WHERE user_id = $1
     AND created_at::date = CURRENT_DATE`,
    [userId]
  ),

  db.query(
    `SELECT provider, COUNT(*) AS count
     FROM usage_events
     WHERE user_id = $1
     GROUP BY provider
     ORDER BY count DESC`,
    [userId]
  ),
]);

return NextResponse.json({
  total: Number(totalResult.rows[0]?.n ?? 0),
  today: Number(todayResult.rows[0]?.n ?? 0),
  byProvider: providerResult.rows.map((row) => ({
    provider: row.provider,
    count: Number(row.count),
  })),
});

} catch (error) {
console.error("Usage statistics error", error);

return NextResponse.json(
  { error: "Не удалось загрузить статистику." },
  { status: 500 }
);

}
}
