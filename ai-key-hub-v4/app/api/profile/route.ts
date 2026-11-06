import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const { currentPassword, newPassword } = await req.json();
  if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128) return NextResponse.json({ error: "Новый пароль должен содержать от 10 до 128 символов." }, { status: 400 });
  const row = db.prepare("SELECT password_hash FROM users WHERE id=?").get(userId) as {password_hash:string}|undefined;
  if (!row || typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword,row.password_hash))) return NextResponse.json({ error: "Текущий пароль неверен." }, { status: 401 });
  const hash = await bcrypt.hash(newPassword,12);
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash,userId);
  return NextResponse.json({ ok:true });
}