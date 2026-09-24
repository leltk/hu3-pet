import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function POST(request: Request){
  const body=await request.json();
  const name=String(body.name??"").trim().slice(0,32);
  if(!name)return NextResponse.json({error:"Nome obrigatório"},{status:400});
  const {rows}=await db.query("INSERT INTO pets (name,species,color) VALUES ($1,$2,$3) RETURNING *",[name,String(body.species??"blob"),String(body.color??"green")]);
  return NextResponse.json(rows[0],{status:201});
}