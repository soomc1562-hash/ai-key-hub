import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = db.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?").get(normalizedEmail) as { id: string; email: string; password_hash: string; role: string } | undefined;
    if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Не удалось выполнить вход." }, { status: 500 });
  }
}