import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db, ensureSchema } from "@/lib/db";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
try {
await ensureSchema();

const { email, password } = await req.json();

const normalizedEmail = String(email || "").trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
  return NextResponse.json(
    { error: "Укажи корректный email." },
    { status: 400 }
  );
}

if (
  typeof password !== "string" ||
  password.length < 10 ||
  password.length > 128
) {
  return NextResponse.json(
    { error: "Пароль должен содержать от 10 до 128 символов." },
    { status: 400 }
  );
}

const id = randomUUID();
const hash = await bcrypt.hash(password, 12);

const role =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() === normalizedEmail
    ? "admin"
    : "user";

try {
  await db.query(
    `INSERT INTO users (id, email, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, normalizedEmail, hash, role, new Date().toISOString()]
  );
} catch (error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return NextResponse.json(
      { error: "Аккаунт с таким email уже существует." },
      { status: 409 }
    );
  }

  throw error;
}

await createSession(id);

return NextResponse.json(
  {
    user: {
      id,
      email: normalizedEmail,
      role,
    },
  },
  { status: 201 }
);

} catch (e) {
console.error("Registration error", e);

return NextResponse.json(
  { error: "Не удалось создать аккаунт. Проверь настройки сервера." },
  { status: 500 }
);

}
}
