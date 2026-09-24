import {NextResponse} from "next/server";
import {db} from "@/lib/db";

export async function POST(request:Request){
  const key=process.env.HU3_ADMIN_KEY;
  if(!key||request.headers.get("x-hu3-admin-key")!==key)return NextResponse.json({error:"Não autorizado"},{status:401});
  const {id}=await request.json();
  if(!id)return NextResponse.json({error:"ID obrigatório"},{status:400});
  const used=await db.query("SELECT 1 FROM pet_items WHERE item_id=$1 LIMIT 1",[id]);
  if(used.rowCount)return NextResponse.json({error:"Item já pertence ao inventário de um pet e não pode ser apagado."},{status:409});
  await db.query("DELETE FROM item_definitions WHERE id=$1",[id]);
  return NextResponse.json({ok:true});
}