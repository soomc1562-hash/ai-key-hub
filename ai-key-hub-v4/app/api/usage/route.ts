import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
export async function GET() {
 const userId=await getUserId(); if(!userId) return NextResponse.json({error:"Требуется вход."},{status:401});
 const total=(db.prepare("SELECT COUNT(*) AS n FROM usage_events WHERE user_id=?").get(userId) as any).n;
 const today=(db.prepare("SELECT COUNT(*) AS n FROM usage_events WHERE user_id=? AND date(created_at)=date('now')").get(userId) as any).n;
 const byProvider=db.prepare("SELECT provider, COUNT(*) AS count FROM usage_events WHERE user_id=? GROUP BY provider ORDER BY count DESC").all(userId);
 return NextResponse.json({total,today,byProvider});
}