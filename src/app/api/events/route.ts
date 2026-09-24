import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function rollRarity(rare:number,special:number) {
  const r=Math.random()*100;
  if(r<Math.min(3+special,12)) return "special";
  if(r<Math.min(15+rare,35)) return "rare";
  return "common";
}

export async function GET(request:Request){
  const petId=new URL(request.url).searchParams.get("petId");
  if(!petId)return NextResponse.json({error:"petId é obrigatório"},{status:400});
  const rows=await db.query("SELECT * FROM game_events WHERE pet_id=$1 ORDER BY created_at DESC LIMIT 12",[petId]);
  return NextResponse.json(rows.rows);
}

export async function POST(request:Request){
  const {petId}=await request.json();
  if(!petId)return NextResponse.json({error:"petId é obrigatório"},{status:400});
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const pet=(await client.query("SELECT * FROM pets WHERE id=$1 FOR UPDATE",[petId])).rows[0];
    if(!pet){await client.query("ROLLBACK");return NextResponse.json({error:"Pet não encontrado"},{status:404});}
    const recent=(await client.query(
      "SELECT 1 FROM game_events WHERE pet_id=$1 AND created_at>NOW()-INTERVAL '6 hours' LIMIT 1",[petId])).rowCount;
    if(recent){await client.query("ROLLBACK");return NextResponse.json({event:null,nextRoll:"6h"});}
    const gear=(await client.query(
      "SELECT i.effects FROM item_definitions i JOIN pet_equipment pe ON pe.item_id=i.id WHERE pe.pet_id=$1",[petId])).rows;
    let rare=0,special=0;
    for(const row of gear) {
      rare+=Number(row.effects?.rare_event_chance??0);
      special+=Number(row.effects?.special_event_chance??0);
    }
    const rarity=rollRarity(rare,special);
    const pool=(await client.query(
      "SELECT * FROM event_definitions WHERE active=TRUE AND rarity=$1",
      [rarity]
    )).rows;
    if(!pool.length){
      await client.query("ROLLBACK");
      return NextResponse.json({event:null,nextRoll:"no-content"});
    }
    const definition=pool[Math.floor(Math.random()*pool.length)];
    const event=(await client.query(
      "INSERT INTO game_events(pet_id,event_type,title,description,rarity,rewards) VALUES($1,'encounter',$2,$3,$4,$5) RETURNING *",
      [petId,definition.title,definition.description,rarity,definition.rewards]
    )).rows[0];
    await client.query("COMMIT");
    return NextResponse.json(event);
  }catch(error){await client.query("ROLLBACK");return NextResponse.json({error:error instanceof Error?error.message:"Erro ao gerar evento"},{status:500});}
  finally{client.release();}
}
