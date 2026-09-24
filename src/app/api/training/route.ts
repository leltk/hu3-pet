import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const ACTIONS: Record<string,{label:string;stat:string;amount:number;stamina:number;stress:number;coins:number}> = {
  cs:{label:"Farm Training",stat:"cs",amount:3,stamina:-8,stress:3,coins:-2},
  positioning:{label:"Positioning Drill",stat:"positioning",amount:3,stamina:-8,stress:3,coins:-2},
  skillshots:{label:"Skillshot Practice",stat:"skillshots",amount:3,stamina:-9,stress:4,coins:-2},
  dodge:{label:"Dodge Drill",stat:"dodge",amount:3,stamina:-8,stress:3,coins:-2},
  combat:{label:"Combat Drill",stat:"combat",amount:3,stamina:-10,stress:5,coins:-3},
  mechanics:{label:"Mechanics Lab",stat:"mechanics",amount:3,stamina:-10,stress:5,coins:-3},
  vision:{label:"Replay: Vision",stat:"vision",amount:3,stamina:-5,stress:2,coins:-2},
  objectives:{label:"Objective Lesson",stat:"objectives",amount:3,stamina:-5,stress:2,coins:-2},
  rotations:{label:"Rotation Review",stat:"rotations",amount:3,stamina:-5,stress:2,coins:-2},
  wave_control:{label:"Wave Review",stat:"wave_control",amount:3,stamina:-5,stress:2,coins:-2},
  decision_making:{label:"VOD Coaching",stat:"decision_making",amount:3,stamina:-6,stress:2,coins:-2}
};

export async function POST(request: Request) {
  const {petId, action} = await request.json();
  const config = ACTIONS[String(action)];
  if (!petId || !config) return NextResponse.json({error:"Treino inválido"},{status:400});
  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const {rows}=await client.query("SELECT * FROM pets WHERE id=$1 FOR UPDATE",[petId]);
    const pet=rows[0];
    if (!pet) { await client.query("ROLLBACK"); return NextResponse.json({error:"Pet não encontrado"},{status:404}); }
    if (pet.next_ranked_at && new Date(pet.next_ranked_at)>new Date()) { await client.query("ROLLBACK"); return NextResponse.json({error:"Seu pet está em uma ranqueada."},{status:409}); }
    if (pet.stamina<Math.abs(config.stamina)) { await client.query("ROLLBACK"); return NextResponse.json({error:"Sem stamina. Hora de descansar."},{status:409}); }
    if (pet.coins+config.coins<0) { await client.query("ROLLBACK"); return NextResponse.json({error:"Sem moedas para esse treino."},{status:409}); }

    const stat=config.stat;
    const current=Number(pet[stat]??0);
    const gain=Math.max(1,Math.round(config.amount*(1-Math.min(current,100)/220)));
    const query="UPDATE pets SET "+stat+"="+stat+"+$1, stamina=GREATEST(0,stamina+$2), stress=LEAST(100,stress+$3), coins=GREATEST(0,coins+$4), xp=xp+10, updated_at=NOW() WHERE id=$5";
    await client.query(query,[gain,config.stamina,config.stress,config.coins,petId]);
    await client.query("INSERT INTO pet_activities(pet_id,activity,stat,amount,stamina_delta,stress_delta,coins_delta) VALUES($1,$2,$3,$4,$5,$6,$7)",[petId,config.label,stat,gain,config.stamina,config.stress,config.coins]);
    await client.query("COMMIT");
    const updated=await db.query("SELECT * FROM pets WHERE id=$1",[petId]);
    return NextResponse.json({pet:updated.rows[0],message:"+"+gain+" "+stat});
  } catch(error) {
    await client.query("ROLLBACK");
    return NextResponse.json({error:error instanceof Error?error.message:"Erro no treino"},{status:400});
  } finally { client.release(); }
}
