import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request:Request){
  const {petId,eventId}=await request.json();
  if(!petId||!eventId)return NextResponse.json({error:"petId e eventId são obrigatórios"},{status:400});
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const event=(await client.query("SELECT * FROM game_events WHERE id=$1 AND pet_id=$2 FOR UPDATE",[eventId,petId])).rows[0];
    if(!event){await client.query("ROLLBACK");return NextResponse.json({error:"Evento não encontrado"},{status:404});}
    if(event.claimed){await client.query("ROLLBACK");return NextResponse.json({error:"Evento já resgatado"},{status:409});}
    const rewards=event.rewards??{};
    const xp=Math.max(0,Number(rewards.xp??0)),coins=Math.max(0,Number(rewards.coins??0));
    await client.query("UPDATE pets SET xp=xp+$1,coins=coins+$2,updated_at=NOW() WHERE id=$3",[xp,coins,petId]);
    if(rewards.stamina) await client.query("UPDATE pets SET stamina=LEAST(100,stamina+$1) WHERE id=$2",[Number(rewards.stamina),petId]);
    if(rewards.item_id){
      const quantity=Math.max(1,Number(rewards.item_quantity??1));
      await client.query(
        "INSERT INTO pet_items(pet_id,item_id,quantity) VALUES($1,$2,$3) ON CONFLICT(pet_id,item_id) DO UPDATE SET quantity=pet_items.quantity+$3",
        [petId,rewards.item_id,quantity]
      );
    }
    await client.query("UPDATE game_events SET claimed=TRUE,claimed_at=NOW() WHERE id=$1",[eventId]);
    await client.query("INSERT INTO pet_activities(pet_id,activity,stat,amount,stamina_delta,stress_delta,coins_delta,message) VALUES($1,'event_reward',NULL,1,$2,0,$3,$4)",
      [petId,Number(rewards.stamina??0),coins,`🎁 Evento: ${event.title} · recompensa resgatada.`]);
    await client.query("COMMIT");
    const pet=(await db.query("SELECT * FROM pets WHERE id=$1",[petId])).rows[0];
    return NextResponse.json({ok:true,pet,event});
  }catch(error){await client.query("ROLLBACK");return NextResponse.json({error:error instanceof Error?error.message:"Erro ao resgatar evento"},{status:500});}
  finally{client.release();}
}
