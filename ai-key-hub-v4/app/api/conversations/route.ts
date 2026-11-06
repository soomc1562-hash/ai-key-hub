import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const rows = db.prepare("SELECT id, provider, title, folder, messages_json AS messages, updated_at AS updatedAt FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as any[];
  return NextResponse.json({ conversations: rows.map(r => ({ ...r, messages: JSON.parse(r.messages) })) });
}
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  try {
    const { id, provider, title, folder, messages } = await req.json();
    if (typeof provider !== "string" || !Array.isArray(messages) || messages.length > 200) return NextResponse.json({ error: "Некорректные данные диалога." }, { status: 400 });
    const safeMessages = messages.filter((m: any) => ["user", "assistant"].includes(m?.role) && typeof m?.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 12000) }));
    const conversationId = typeof id === "string" && id.length < 80 ? id : randomUUID();
    const cleanTitle = (typeof title === "string" ? title : safeMessages.find((m: any) => m.role === "user")?.content || "Новый чат").slice(0, 100);
    const cleanFolder = (typeof folder === "string" ? folder : "General").slice(0, 40);
    db.prepare(`INSERT INTO conversations (id, user_id, provider, title, folder, messages_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET provider=excluded.provider, title=excluded.title, folder=excluded.folder, messages_json=excluded.messages_json, updated_at=excluded.updated_at
      WHERE conversations.user_id=excluded.user_id`).run(conversationId, userId, provider, cleanTitle, cleanFolder, JSON.stringify(safeMessages), new Date().toISOString());
    return NextResponse.json({ id: conversationId });
  } catch { return NextResponse.json({ error: "Не удалось сохранить диалог." }, { status: 400 }); }
}
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const { id, folder } = await req.json();
  if (typeof id !== "string" || typeof folder !== "string" || folder.length > 40) return NextResponse.json({ error: "Некорректная папка." }, { status: 400 });
  const result = db.prepare("UPDATE conversations SET folder=?, updated_at=? WHERE id=? AND user_id=?").run(folder, new Date().toISOString(), id, userId);
  return NextResponse.json({ ok: result.changes > 0 });
}
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) db.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").run(id, userId);
  else db.prepare("DELETE FROM conversations WHERE user_id = ?").run(userId);
  return NextResponse.json({ ok: true });
}