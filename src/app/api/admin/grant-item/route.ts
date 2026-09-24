import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function authorized(request: Request) {
  const key = process.env.HU3_ADMIN_KEY;
  return Boolean(key && request.headers.get("x-hu3-admin-key") === key);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json();
  const petId = String(body.petId ?? "");
  const itemId = String(body.itemId ?? "");
  const amount = Math.max(1, Math.min(999, Number(body.amount ?? 1)));
  if (!petId || !itemId || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Pet, item e quantidade são obrigatórios" }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const pet = (await client.query("SELECT id FROM pets WHERE id=$1 FOR UPDATE", [petId])).rows[0];
    if (!pet) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 }); }
    const item = (await client.query("SELECT id,name FROM item_definitions WHERE id=$1", [itemId])).rows[0];
    if (!item) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Item não encontrado" }, { status: 404 }); }

    const result = await client.query(
      `INSERT INTO pet_items(pet_id,item_id,quantity) VALUES($1,$2,$3)
       ON CONFLICT(pet_id,item_id) DO UPDATE SET quantity=pet_items.quantity+EXCLUDED.quantity
       RETURNING quantity`,
      [petId, itemId, amount]
    );
    await client.query(
      `INSERT INTO admin_audit_log(action,pet_id,item_id,amount,payload)
       VALUES('grant_item',$1,$2,$3,$4)`,
      [petId, itemId, amount, JSON.stringify({ itemName: item.name })]
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, quantity: result.rows[0].quantity });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível entregar o item" }, { status: 500 });
  } finally { client.release(); }
}
