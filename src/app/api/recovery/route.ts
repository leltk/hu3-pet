import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request:Request){
  const {petId}=await request.json();
  if(!petId) return NextResponse.json({error:"Pet obrigatório"},{status:400});
  const {rows}=await db.query(
    "UPDATE pets SET stamina=LEAST(100,stamina+35), stress=GREATEST(0,stress-28), coins=coins+8, xp=xp+15, updated_at=NOW() WHERE id=$1 AND (next_ranked_at IS NULL OR next_ranked_at<=NOW()) RETURNING *",
    [petId]
  );
  if(!rows[0]) return NextResponse.json({error:"Não é possível descansar agora."},{status:409});
  return NextResponse.json({pet:rows[0],message:"😴 Descansou, recuperou stamina e ganhou 8 moedas."});
}
