import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { petId, itemId } = await request.json();
  if (!petId || !itemId) return NextResponse.json({ error: "petId e itemId são obrigatórios" }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const item = (await client.query(
      `SELECT i.* FROM item_definitions i
       JOIN pet_items pi ON pi.item_id=i.id
       WHERE i.id=$1 AND pi.pet_id=$2`,
      [itemId, petId]
    )).rows[0];

    if (!item) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Item não encontrado na mochila" }, { status: 404 });
    }
    if (!item.slot) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Esse item não é equipamento" }, { status: 400 });
    }

    await client.query("DELETE FROM pet_equipment WHERE pet_id=$1 AND slot=$2", [petId,item.slot]);
    await client.query(
      "INSERT INTO pet_equipment (pet_id,slot,item_id) VALUES ($1,$2,$3)",
      [petId,item.slot,itemId]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok:true, slot:item.slot, itemId });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error:"Não foi possível equipar o item" }, { status:500 });
  } finally {
    client.release();
  }
}