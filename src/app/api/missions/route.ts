import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPeriodKey } from "@/lib/game/missions";

export async function GET(request: Request) {
  const petId = new URL(request.url).searchParams.get("petId");
  if (!petId) return NextResponse.json({error:"petId é obrigatório"},{status:400});
  const client = await db.connect();
  try {
    const defs = await client.query("SELECT * FROM mission_definitions WHERE active=TRUE ORDER BY period,id");
    for (const m of defs.rows) {
      await client.query(
        "INSERT INTO pet_missions(pet_id,mission_id,period_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [petId,m.id,getPeriodKey(m.period)]
      );
    }
    const missions = await client.query(
      `SELECT pm.*,m.name,m.description,m.target,m.period,m.rewards
       FROM pet_missions pm JOIN mission_definitions m ON m.id=pm.mission_id
       WHERE pm.pet_id=$1 AND pm.period_key IN ($2,$3)
       ORDER BY m.period,m.id`,
      [petId,getPeriodKey("daily"),getPeriodKey("weekly")]
    );
    return NextResponse.json(missions.rows);
  } finally { client.release(); }
}

export async function POST(request: Request) {
  const {petId,missionId} = await request.json();
  if (!petId||!missionId) return NextResponse.json({error:"petId e missionId são obrigatórios"},{status:400});
  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const row=(await client.query(
      `SELECT pm.*,m.name,m.target,m.rewards
       FROM pet_missions pm JOIN mission_definitions m ON m.id=pm.mission_id
       WHERE pm.pet_id=$1 AND pm.mission_id=$2 AND pm.period_key IN ($3,$4)
       FOR UPDATE`,
      [petId,missionId,getPeriodKey("daily"),getPeriodKey("weekly")])).rows[0];
    if(!row){await client.query("ROLLBACK");return NextResponse.json({error:"Missão não encontrada"},{status:404});}
    if(row.claimed){await client.query("ROLLBACK");return NextResponse.json({error:"Recompensa já resgatada"},{status:409});}
    if(row.progress<row.target){await client.query("ROLLBACK");return NextResponse.json({error:"Missão ainda não concluída"},{status:409});}
    const rewards=row.rewards??{};
    const xp=Math.max(0,Number(rewards.xp??0)),coins=Math.max(0,Number(rewards.coins??0));
    await client.query("UPDATE pets SET xp=xp+$1,coins=coins+$2,updated_at=NOW() WHERE id=$3",[xp,coins,petId]);
    let granted=null;
    if(rewards.item_id){
      const q=Math.max(1,Number(rewards.item_quantity??1));
      await client.query(
        "INSERT INTO pet_items(pet_id,item_id,quantity) VALUES($1,$2,$3) ON CONFLICT(pet_id,item_id) DO UPDATE SET quantity=pet_items.quantity+$3",
        [petId,rewards.item_id,q]
      );
      granted={itemId:rewards.item_id,quantity:q};
    }
    await client.query("UPDATE pet_missions SET claimed=TRUE WHERE id=$1",[row.id]);
    await client.query(
      "INSERT INTO pet_activities(pet_id,activity,stat,amount,stamina_delta,stress_delta,coins_delta,message) VALUES($1,'mission_reward',NULL,1,0,0,$2,$3)",
      [petId,coins,`🎯 Missão concluída: ${row.name}. +${xp} XP · +${coins} moedas.`]
    );
    await client.query("COMMIT");
    const pet=(await db.query("SELECT * FROM pets WHERE id=$1",[petId])).rows[0];
    return NextResponse.json({ok:true,pet,rewards:{xp,coins,granted}});
  } catch(error){await client.query("ROLLBACK");return NextResponse.json({error:error instanceof Error?error.message:"Erro ao resgatar missão"},{status:500});}
  finally{client.release();}
}
