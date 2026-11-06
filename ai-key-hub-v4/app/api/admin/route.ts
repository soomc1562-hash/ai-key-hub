import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
export async function GET() {
 const id=await getUserId(); if(!id) return NextResponse.json({error:"Требуется вход."},{status:401});
 const user=db.prepare("SELECT role FROM users WHERE id=?").get(id) as {role:string}|undefined;
 if(user?.role!=="admin") return NextResponse.json({error:"Недостаточно прав."},{status:403});
 const users=(db.prepare("SELECT COUNT(*) AS n FROM users").get() as any).n;
 const chats=(db.prepare("SELECT COUNT(*) AS n FROM conversations").get() as any).n;
 const requests=(db.prepare("SELECT COUNT(*) AS n FROM usage_events").get() as any).n;
 const recent=db.prepare("SELECT email, created_at AS createdAt, role FROM users ORDER BY created_at DESC LIMIT 8").all();
 return NextResponse.json({users,chats,requests,recent});
}