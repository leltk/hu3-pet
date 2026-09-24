import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function auth(request:Request){return process.env.HU3_ADMIN_KEY && request.headers.get("x-hu3-admin-key")===process.env.HU3_ADMIN_KEY;}

export async function GET(request:Request){
  if(!auth(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  const [missions,events]=await Promise.all([
    db.query("SELECT * FROM mission_definitions ORDER BY period,id"),
    db.query("SELECT * FROM event_definitions ORDER BY rarity,id")
  ]);
  return NextResponse.json({missions:missions.rows,events:events.rows});
}

export async function POST(request:Request){
  if(!auth(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  const body=await request.json();
  const type=body.type;
  if(type==="mission"){
    const id=String(body.id??"").trim().slice(0,64);
    const name=String(body.name??"").trim().slice(0,80);
    const description=String(body.description??"").trim().slice(0,300);
    const trigger=String(body.trigger??"training");
    const target=Math.max(1,Math.min(9999,Number(body.target)||1));
    const period=body.period==="weekly"?"weekly":"daily";
    const rewards=body.rewards&&typeof body.rewards==="object"?body.rewards:{};
    if(!id||!name||!description)return NextResponse.json({error:"ID, nome e descrição são obrigatórios"},{status:400});
    await db.query(
      `INSERT INTO mission_definitions(id,name,description,trigger,target,period,rewards,active)
       VALUES($1,$2,$3,$4,$5,$6,$7,TRUE)
       ON CONFLICT(id) DO UPDATE SET name=$2,description=$3,trigger=$4,target=$5,period=$6,rewards=$7`,
      [id,name,description,trigger,target,period,JSON.stringify(rewards)]
    );
    return NextResponse.json({ok:true});
  }
  if(type==="event"){
    const id=String(body.id??"").trim().slice(0,64);
    const title=String(body.title??"").trim().slice(0,100);
    const description=String(body.description??"").trim().slice(0,300);
    const rarity=["common","rare","special"].includes(body.rarity)?body.rarity:"common";
    const rewards=body.rewards&&typeof body.rewards==="object"?body.rewards:{};
    if(!id||!title||!description)return NextResponse.json({error:"ID, título e descrição são obrigatórios"},{status:400});
    await db.query(
      `INSERT INTO event_definitions(id,title,description,rarity,rewards,active)
       VALUES($1,$2,$3,$4,$5,TRUE)
       ON CONFLICT(id) DO UPDATE SET title=$2,description=$3,rarity=$4,rewards=$5`,
      [id,title,description,rarity,JSON.stringify(rewards)]
    );
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Tipo inválido"},{status:400});
}

export async function DELETE(request:Request){
  if(!auth(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  const body=await request.json();
  if(body.type==="mission") await db.query("UPDATE mission_definitions SET active=FALSE WHERE id=$1",[body.id]);
  else if(body.type==="event") await db.query("UPDATE event_definitions SET active=FALSE WHERE id=$1",[body.id]);
  else return NextResponse.json({error:"Tipo inválido"},{status:400});
  return NextResponse.json({ok:true});
}
