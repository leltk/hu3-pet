import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulateRanked } from "@/lib/game/simulation";
import { applyLp, RANKS } from "@/lib/game/ranks";
import { progressMissions } from "@/lib/game/missions";

export async function POST(request:Request){
  const {matchId}=await request.json();
  const client=await db.connect();
  try {
  await client.query("BEGIN");
  const {rows}=await client.query("SELECT m.*,p.* FROM ranked_matches m JOIN pets p ON p.id=m.pet_id WHERE m.id=$1 FOR UPDATE",[matchId]);
  const row=rows[0];
  if(!row){ await client.query("ROLLBACK"); return NextResponse.json({error:"Partida não encontrada"},{status:404}); }
  if(row.result){ await client.query("ROLLBACK"); return NextResponse.json({error:"Partida já resolvida"},{status:409}); }
  if(new Date(row.finishes_at)>new Date()){ await client.query("ROLLBACK"); return NextResponse.json({error:"A partida ainda está acontecendo",finishesAt:row.finishes_at},{status:409}); }

  const micro=(row.cs+row.positioning+row.skillshots+row.dodge+row.combat+row.mechanics)/6;
  const macro=(row.vision+row.objectives+row.rotations+row.wave_control+row.decision_making)/5;
  const rankIndex=RANKS.indexOf(row.rank_tier);
  const simulation=simulateRanked({
    cs:row.cs,positioning:row.positioning,skillshots:row.skillshots,dodge:row.dodge,
    combat:row.combat,mechanics:row.mechanics,vision:row.vision,objectives:row.objectives,
    rotations:row.rotations,wave_control:row.wave_control,decision_making:row.decision_making,
    stamina:row.stamina,stress:row.stress,luck:row.luck,rankIndex
  });
  const win=simulation.win;
  const lpDelta=win?20:-16, xpDelta=win?120:55, coinsDelta=win?35:15;
  const gearResult=await client.query(
    `SELECT i.effects FROM item_definitions i JOIN pet_equipment pe ON pe.item_id=i.id
     WHERE pe.pet_id=$1`,[row.pet_id]
  );
  const effects:Record<string,number>={};
  for(const gear of gearResult.rows){
    for(const [key,value] of Object.entries(gear.effects??{})){
      if(typeof value==="number") effects[key]=(effects[key]??0)+value;
    }
  }
  const rankedXp=Math.max(0,Math.round(xpDelta*(1+(effects.post_ranked_xp_pct??0)/100)));
  const rank=applyLp(row.rank_tier,row.rank_division,row.lp,lpDelta);

  const durationSeconds=Math.max(0,Math.round((new Date(row.finishes_at).getTime()-new Date(row.started_at).getTime())/1000));
  const highlight=simulation.events[0]??(win?"⚔️ Vitória conquistada no momento decisivo.":"🛡️ O adversário fechou o jogo.");
  await client.query("UPDATE ranked_matches SET result=$1,lp_delta=$2,xp_delta=$3,coins_delta=$4,simulation=$5,duration_seconds=$6,micro_score=$7,macro_score=$8,highlight=$9 WHERE id=$10",
    [win?"WIN":"LOSS",lpDelta,xpDelta,coinsDelta,JSON.stringify(simulation),durationSeconds,Math.round(micro),Math.round(macro),highlight,matchId]);
  const updated=await client.query(
    "UPDATE pets SET rank_tier=$1,rank_division=$2,lp=$3,xp=xp+$4,coins=coins+$5,stress=LEAST(100,stress+$6),stamina=GREATEST(0,stamina-22),next_ranked_at=NULL,updated_at=NOW() WHERE id=$7 RETURNING *",
    [rank.tier,rank.division,rank.lp,rankedXp,coinsDelta,win?8:14,row.pet_id]
  );
  let drop:null|{id:string;name:string;icon:string;rarity:string}=null;
  const dropChance=win?0.30:0.08;
  if(Math.random()<dropChance){
    const pool=(await client.query(
      `SELECT id,name,icon,rarity FROM item_definitions
       WHERE category IN ('equipment','consumable') AND id <> 'energy_cookie'
       ORDER BY RANDOM() LIMIT 1`
    )).rows;
    if(pool[0]){
      drop=pool[0];
      await client.query(
        `INSERT INTO pet_items(pet_id,item_id,quantity) VALUES($1,$2,1)
         ON CONFLICT(pet_id,item_id) DO UPDATE SET quantity=pet_items.quantity+1`,
        [row.pet_id,drop.id]
      );
      await client.query(
        `INSERT INTO pet_activities(pet_id,activity,stat,amount,stamina_delta,stress_delta,coins_delta,message)
         VALUES($1,'ranked_drop',NULL,1,0,0,0,$2)`,
        [row.pet_id,"🎁 Encontrou "+drop.name+" ("+drop.rarity+") após a partida."]
      );
    }
  }

  await progressMissions(client,row.pet_id,"ranked",1);
  if(win) await progressMissions(client,row.pet_id,"ranked_win",1);
  await client.query("COMMIT");
  return NextResponse.json({result:win?"WIN":"LOSS",win,lpDelta,xpDelta:rankedXp,baseXpDelta:xpDelta,coinsDelta,rank,simulation,micro:Math.round(micro),macro:Math.round(macro),highlight,drop,pet:updated.rows[0]});
  } catch(error) {
    await client.query("ROLLBACK");
    return NextResponse.json({error:error instanceof Error?error.message:"Erro ao resolver partida"},{status:400});
  } finally {
    client.release();
  }
}
