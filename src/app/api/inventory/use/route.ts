import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request:Request){
  const {petId,itemId}=await request.json();
  if(!petId||!itemId)return NextResponse.json({error:"petId e itemId são obrigatórios"},{status:400});
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const row=(await client.query(
      "SELECT p.*, i.category, i.name, i.effects, pi.quantity FROM pets p JOIN pet_items pi ON pi.pet_id=p.id JOIN item_definitions i ON i.id=pi.item_id WHERE p.id=$1 AND i.id=$2 FOR UPDATE",
      [petId,itemId])).rows[0];
    if(!row){await client.query("ROLLBACK");return NextResponse.json({error:"Item não encontrado na mochila"},{status:404});}
    if(row.category!=="consumable"){await client.query("ROLLBACK");return NextResponse.json({error:"Esse item não é consumível"},{status:400});}
    const effects=row.effects??{};
    const stamina=Math.max(0,Number(effects.stamina_restore??0));
    if(stamina<=0){await client.query("ROLLBACK");return NextResponse.json({error:"Esse consumível ainda não possui efeito de uso"},{status:400});}
    await client.query("UPDATE pets SET stamina=LEAST(100,stamina+$1), stress=GREATEST(0,stress-4), updated_at=NOW() WHERE id=$2",[stamina,petId]);
    if(row.quantity<=1) await client.query("DELETE FROM pet_items WHERE pet_id=$1 AND item_id=$2",[petId,itemId]);
    else await client.query("UPDATE pet_items SET quantity=quantity-1 WHERE pet_id=$1 AND item_id=$2",[petId,itemId]);
    const message="🍪 Usou "+row.name+" e recuperou "+stamina+" de stamina.";
    await client.query("INSERT INTO pet_activities(pet_id,activity,stat,amount,stamina_delta,stress_delta,coins_delta,message) VALUES($1,'consumable',NULL,$2,$2,-4,0,$3)",[petId,stamina,message]);
    await client.query("COMMIT");
    const pet=(await db.query("SELECT * FROM pets WHERE id=$1",[petId])).rows[0];
    return NextResponse.json({ok:true,pet,message});
  }catch(error){await client.query("ROLLBACK");return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível usar o item"},{status:500});}
  finally{client.release();}
}