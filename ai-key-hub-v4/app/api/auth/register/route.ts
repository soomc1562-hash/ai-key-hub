import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return NextResponse.json({ error: "Укажи корректный email." }, { status: 400 });
    if (typeof password !== "string" || password.length < 10 || password.length > 128) return NextResponse.json({ error: "Пароль должен содержать от 10 до 128 символов." }, { status: 400 });
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail)) return NextResponse.json({ error: "Аккаунт с таким email уже существует." }, { status: 409 });
    const id = randomUUID();
    const hash = await bcrypt.hash(password, 12);
    db.prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)").run(id, normalizedEmail, hash, process.env.ADMIN_EMAIL?.toLowerCase() === normalizedEmail ? 'admin' : 'user', new Date().toISOString());
    await createSession(id);
    return NextResponse.json({ user: { id, email: normalizedEmail, role: process.env.ADMIN_EMAIL?.toLowerCase() === normalizedEmail ? 'admin' : 'user' } }, { status: 201 });
  } catch (e) {
    console.error("Registration error", e);
    return NextResponse.json({ error: "Не удалось создать аккаунт. Проверь настройки сервера." }, { status: 500 });
  }
}