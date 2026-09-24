import { NextResponse } from "next/server";
import { db } from "@/lib/db";
const DURATION=30*60*1000;
export async function POST(request: Request){
 const {petId}=await request.json();
 const {rows}=await db.query("SELECT * FROM pets WHERE id=$1",[petId]);
 const pet=rows[0]; if(!pet)return NextResponse.json({error:"Pet não encontrado"},{status:404});
 const now=new Date();
 if(pet.next_ranked_at&&new Date(pet.next_ranked_at)>now)return NextResponse.json({error:"O pet ainda está em partida",nextRankedAt:pet.next_ranked_at},{status:409});
 const finishes=new Date(now.getTime()+DURATION);
 const match=await db.query("INSERT INTO ranked_matches (pet_id,finishes_at) VALUES ($1,$2) RETURNING id,finishes_at",[petId,finishes]);
 await db.query("UPDATE pets SET next_ranked_at=$1,updated_at=NOW() WHERE id=$2",[finishes,petId]);
 return NextResponse.json(match.rows[0],{status:201});
}