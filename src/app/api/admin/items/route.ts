import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function authorized(request:Request){
  const key=process.env.HU3_ADMIN_KEY;
  return Boolean(key && request.headers.get("x-hu3-admin-key")===key);
}

export async function GET(request:Request){
  if(!authorized(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  const [items,effects]=await Promise.all([
    db.query("SELECT * FROM item_definitions ORDER BY created_at DESC"),
    db.query("SELECT * FROM effect_definitions ORDER BY name")
  ]);
  return NextResponse.json({items:items.rows,effects:effects.rows});
}

export async function POST(request:Request){
  if(!authorized(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  const body=await request.json();
  const id=String(body.id??"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"_").slice(0,64);
  const name=String(body.name??"").trim().slice(0,64);
  const description=String(body.description??"").trim();
  if(!id||!name||!description)return NextResponse.json({error:"ID, nome e descrição são obrigatórios"},{status:400});
  const effects=body.effects && typeof body.effects==="object" ? body.effects : {};
  const result=await db.query(
    `INSERT INTO item_definitions(id,name,description,category,slot,rarity,icon,effects,visual,origin,tradable,limited)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,category=EXCLUDED.category,
       slot=EXCLUDED.slot,rarity=EXCLUDED.rarity,icon=EXCLUDED.icon,effects=EXCLUDED.effects,visual=EXCLUDED.visual,
       origin=EXCLUDED.origin,tradable=EXCLUDED.tradable,limited=EXCLUDED.limited
     RETURNING *`,
    [id,name,description,String(body.category??"equipment"),body.slot?String(body.slot):null,String(body.rarity??"common"),
      String(body.icon??"📦"),JSON.stringify(effects),JSON.stringify(body.visual??{}),body.origin?String(body.origin):null,
      body.tradable!==false,body.limited===true]
  );
  return NextResponse.json(result.rows[0]);
}