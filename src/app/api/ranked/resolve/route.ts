import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulateRanked } from "@/lib/game/simulation";
import { applyLp, RANKS } from "@/lib/game/ranks";

export async function POST(request:Request){
  const {matchId}=await request.json();
  const {rows}=await db.query("SELECT m.*,p.* FROM ranked_matches m JOIN pets p ON p.id=m.pet_id WHERE m.id=$1",[matchId]);
  const row=rows[0];
  if(!row)return NextResponse.json({error:"Partida não encontrada"},{status:404});
  if(row.result)return NextResponse.json({error:"Partida já resolvida"},{status:409});
  if(new Date(row.finishes_at)>new Date())return NextResponse.json({error:"A partida ainda está acontecendo",finishesAt:row.finishes_at},{status:409});

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
  const rank=applyLp(row.rank_tier,row.rank_division,row.lp,lpDelta);

  const durationSeconds=Math.max(0,Math.round((new Date(row.finishes_at).getTime()-new Date(row.started_at).getTime())/1000));
  const highlight=simulation.events[0]??(win?"⚔️ Vitória conquistada no momento decisivo.":"🛡️ O adversário fechou o jogo.");
  await db.query("UPDATE ranked_matches SET result=$1,lp_delta=$2,xp_delta=$3,coins_delta=$4,simulation=$5,duration_seconds=$6,micro_score=$7,macro_score=$8,highlight=$9 WHERE id=$10",
    [win?"WIN":"LOSS",lpDelta,xpDelta,coinsDelta,JSON.stringify(simulation),durationSeconds,Math.round(micro),Math.round(macro),highlight,matchId]);
  const updated=await db.query(
    "UPDATE pets SET rank_tier=$1,rank_division=$2,lp=$3,xp=xp+$4,coins=coins+$5,stress=LEAST(100,stress+$6),stamina=GREATEST(0,stamina-22),next_ranked_at=NULL,updated_at=NOW() WHERE id=$7 RETURNING *",
    [rank.tier,rank.division,rank.lp,xpDelta,coinsDelta,win?8:14,row.pet_id]
  );
  return NextResponse.json({result:win?"WIN":"LOSS",win,lpDelta,xpDelta,coinsDelta,rank,simulation,micro:Math.round(micro),macro:Math.round(macro),highlight,pet:updated.rows[0]});
}
