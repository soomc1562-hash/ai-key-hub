import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
try {
const userId = await getUserId();

if (!userId) {
  return NextResponse.json(
    { error: "Требуется вход." },
    { status: 401 }
  );
}

await ensureSchema();

const { currentPassword, newPassword } = await req.json();

if (
  typeof newPassword !== "string" ||
  newPassword.length < 10 ||
  newPassword.length > 128
) {
  return NextResponse.json(
    { error: "Новый пароль должен содержать от 10 до 128 символов." },
    { status: 400 }
  );
}

const result = await db.query(
  "SELECT password_hash FROM users WHERE id = $1 LIMIT 1",
  [userId]
);

const row = result.rows[0] as
  | { password_hash: string }
  | undefined;

if (
  !row ||
  typeof currentPassword !== "string" ||
  !(await bcrypt.compare(currentPassword, row.password_hash))
) {
  return NextResponse.json(
    { error: "Текущий пароль неверен." },
    { status: 401 }
  );
}

const hash = await bcrypt.hash(newPassword, 12);

await db.query(
  "UPDATE users SET password_hash = $1 WHERE id = $2",
  [hash, userId]
);

return NextResponse.json({ ok: true });

} catch (error) {
console.error("Profile update error", error);

return NextResponse.json(
  { error: "Не удалось изменить пароль." },
  { status: 500 }
);

}
}
