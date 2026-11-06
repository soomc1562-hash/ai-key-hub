import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, ensureSchema } from "@/lib/db";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
try {
await ensureSchema();

const { email, password } = await req.json();

const normalizedEmail = String(email || "").trim().toLowerCase();

if (typeof password !== "string") {
  return NextResponse.json(
    { error: "Неверный email или пароль." },
    { status: 401 }
  );
}

const result = await db.query(
  `SELECT id, email, password_hash, role
   FROM users
   WHERE LOWER(email) = LOWER($1)
   LIMIT 1`,
  [normalizedEmail]
);

const user = result.rows[0] as
  | {
      id: string;
      email: string;
      password_hash: string;
      role: string;
    }
  | undefined;

if (!user || !(await bcrypt.compare(password, user.password_hash))) {
  return NextResponse.json(
    { error: "Неверный email или пароль." },
    { status: 401 }
  );
}

await createSession(user.id);

return NextResponse.json({
  user: {
    id: user.id,
    email: user.email,
    role: user.role,
  },
});

} catch (error) {
console.error("Login error", error);

return NextResponse.json(
  { error: "Не удалось выполнить вход." },
  { status: 500 }
);

}
}
