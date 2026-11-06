import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
export async function GET() {
  try {
    const id = await getUserId();
    if (!id) return NextResponse.json({ user: null });
    const user = db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(id);
    return NextResponse.json({ user: user || null });
  } catch {
    return NextResponse.json({ user: null });
  }
}