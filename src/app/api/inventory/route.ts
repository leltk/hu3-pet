import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const petId = new URL(request.url).searchParams.get("petId");
  if (!petId) return NextResponse.json({ error: "petId é obrigatório" }, { status: 400 });

  const { rows } = await db.query(
    `SELECT
       i.*,
       pi.quantity,
       pe.slot AS "equippedSlot"
     FROM item_definitions i
     JOIN pet_items pi ON pi.item_id = i.id AND pi.pet_id = $1
     LEFT JOIN pet_equipment pe ON pe.item_id = i.id AND pe.pet_id = $1
     ORDER BY CASE i.rarity
       WHEN 'legendary' THEN 1 WHEN 'epic' THEN 2 WHEN 'rare' THEN 3
       WHEN 'common' THEN 4 ELSE 5 END, i.name`,
    [petId]
  );

  return NextResponse.json(rows);
}