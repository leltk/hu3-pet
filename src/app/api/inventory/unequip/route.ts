import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { petId, slot } = await request.json();
  if (!petId || !slot) return NextResponse.json({ error:"petId e slot são obrigatórios" }, { status:400 });
  await db.query("DELETE FROM pet_equipment WHERE pet_id=$1 AND slot=$2",[petId,slot]);
  return NextResponse.json({ok:true});
}