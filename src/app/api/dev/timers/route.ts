import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GAME_TIMERS, TEST_MODE } from "@/lib/game/dev";

export async function GET() {
  return NextResponse.json({ enabled: TEST_MODE, timers: GAME_TIMERS });
}

export async function POST(request: Request) {
  if (!TEST_MODE) {
    return NextResponse.json({ error: "Modo de teste desativado." }, { status: 404 });
  }

  const { petId, action } = await request.json();
  if (!petId || !action) {
    return NextResponse.json({ error: "petId e action são obrigatórios." }, { status: 400 });
  }

  if (action === "training") {
    await db.query("UPDATE pets SET last_training_at=NULL, updated_at=NOW() WHERE id=$1", [petId]);
    return NextResponse.json({ ok: true, message: "Cooldown de treino liberado." });
  }

  if (action === "ranked") {
    await db.query(
      `UPDATE ranked_matches
       SET finishes_at=NOW()
       WHERE id=(
         SELECT id FROM ranked_matches
         WHERE pet_id=$1 AND result IS NULL
         ORDER BY created_at DESC LIMIT 1
       )`,
      [petId]
    );
    await db.query("UPDATE pets SET next_ranked_at=NOW(), updated_at=NOW() WHERE id=$1", [petId]);
    return NextResponse.json({ ok: true, message: "Ranqueada marcada para conclusão." });
  }

  if (action === "offline") {
    await db.query(
      "UPDATE pets SET last_active_at=NOW()-INTERVAL '2 hours', updated_at=NOW() WHERE id=$1",
      [petId]
    );
    return NextResponse.json({ ok: true, message: "Relógio offline recuado em 2 horas." });
  }

  if (action === "all") {
    await db.query("UPDATE pets SET last_training_at=NULL, last_active_at=NOW()-INTERVAL '2 hours', updated_at=NOW() WHERE id=$1", [petId]);
    await db.query(
      `UPDATE ranked_matches
       SET finishes_at=NOW()
       WHERE id=(
         SELECT id FROM ranked_matches
         WHERE pet_id=$1 AND result IS NULL
         ORDER BY created_at DESC LIMIT 1
       )`,
      [petId]
    );
    await db.query("UPDATE pets SET next_ranked_at=NOW(), updated_at=NOW() WHERE id=$1", [petId]);
    return NextResponse.json({ ok: true, message: "Todos os relógios de teste foram liberados." });
  }

  return NextResponse.json({ error: "Ação de teste desconhecida." }, { status: 400 });
}
