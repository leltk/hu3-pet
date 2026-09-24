import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request:Request){
  const petId=new URL(request.url).searchParams.get("petId");
  if(!petId)return NextResponse.json({error:"petId é obrigatório"},{status:400});
  const {rows}=await db.query(
    "SELECT id,result,lp_delta,xp_delta,coins_delta,micro_score,macro_score,highlight,simulation,started_at,created_at FROM ranked_matches WHERE pet_id=$1 AND result IS NOT NULL ORDER BY created_at DESC LIMIT 10",
    [petId]
  );
  return NextResponse.json(rows);
}
