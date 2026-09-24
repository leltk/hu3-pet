import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type OfflineEvent = {
  message: string;
  stamina: number;
  stress: number;
  xp: number;
  coins: number;
};

function buildOfflineEvent(pet: any, hours: number): OfflineEvent | null {
  if (hours < 0.5) return null;

  const events: OfflineEvent[] = [
    {
      message: "🛌 Dormiu um pouco no quarto e acordou mais disposto.",
      stamina: Math.min(28, Math.max(8, Math.round(hours * 5))),
      stress: -Math.min(16, Math.max(4, Math.round(hours * 3))),
      xp: 0,
      coins: 0
    },
    {
      message: "🧹 Deu uma arrumada no setup enquanto você estava fora.",
      stamina: 0,
      stress: -Math.min(12, Math.max(3, Math.round(hours * 2))),
      xp: Math.min(8, Math.max(2, Math.floor(hours * 2))),
      coins: Math.min(6, Math.max(1, Math.floor(hours))),
    },
    {
      message: "🎮 Ficou praticando sozinho por alguns minutos.",
      stamina: -Math.min(8, Math.max(2, Math.floor(hours * 2))),
      stress: Math.min(8, Math.max(1, Math.floor(hours))),
      xp: Math.min(12, Math.max(2, Math.floor(hours * 3))),
      coins: 0
    },
    {
      message: "🍪 Encontrou um lanchinho perdido perto do teclado.",
      stamina: Math.min(10, Math.max(4, Math.floor(hours * 2))),
      stress: -2,
      xp: 1,
      coins: Math.min(4, Math.max(1, Math.floor(hours))),
    }
  ];

  return events[Math.floor(Math.random() * events.length)];
}

async function loadPet(id: string) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT * FROM pets WHERE id = $1 FOR UPDATE",
      [id]
    );

    const pet = rows[0];
    if (!pet) {
      await client.query("ROLLBACK");
      return { pet: null, offlineReport: null, pendingMatch: null };
    }

    const now = Date.now();
    const lastActive = new Date(pet.last_active_at ?? pet.created_at).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((now - lastActive) / 1000));
    const cappedSeconds = Math.min(elapsedSeconds, 8 * 60 * 60);
    const hours = cappedSeconds / 3600;

    let offlineReport: null | {
      awayMinutes: number;
      passiveXp: number;
      passiveCoins: number;
      events: string[];
    } = null;

    if (cappedSeconds >= 60) {
      const halfHours = Math.floor(cappedSeconds / 1800);
      const passiveXp = Math.min(24, halfHours * 2);
      const passiveCoins = Math.min(12, halfHours);
      const passiveStamina = Math.min(24, Math.floor(cappedSeconds / 3600) * 4);
      const passiveStress = Math.max(-20, -Math.floor(cappedSeconds / 3600) * 3);
      const event = buildOfflineEvent(pet, hours);

      const updates = [
        "xp = xp + $1",
        "coins = coins + $2",
        "stamina = LEAST(100, stamina + $3)",
        "stress = GREATEST(0, stress + $4)",
        "last_active_at = NOW()",
        "updated_at = NOW()"
      ];

      updates[2] = "stamina = LEAST(100, GREATEST(0, stamina + $3 + $5))";
      updates[3] = "stress = LEAST(100, GREATEST(0, stress + $4 + $6))";

      const params: Array<number | string> = [
        passiveXp,
        passiveCoins,
        passiveStamina,
        passiveStress,
        event?.stamina ?? 0,
        event?.stress ?? 0,
        id
      ];

      await client.query(
        `UPDATE pets SET ${updates.join(", ")} WHERE id = $7`,
        params
      );

      const eventMessages: string[] = [];
      if (event) {
        eventMessages.push(event.message);
        await client.query(
          `INSERT INTO pet_activities
            (pet_id, activity, stat, amount, stamina_delta, stress_delta, coins_delta, message)
           VALUES ($1, 'offline_event', NULL, 0, $2, $3, $4, $5)`,
          [id, event.stamina, event.stress, event.coins, event.message]
        );
      }

      offlineReport = {
        awayMinutes: Math.floor(cappedSeconds / 60),
        passiveXp: passiveXp + (event?.xp ?? 0),
        passiveCoins: passiveCoins + (event?.coins ?? 0),
        events: eventMessages
      };

      if (event) {
        await client.query(
          "UPDATE pets SET xp = xp + $1, coins = coins + $2, last_active_at = NOW(), updated_at = NOW() WHERE id = $3",
          [event.xp, event.coins, id]
        );
      }
    } else {
      await client.query(
        "UPDATE pets SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1",
        [id]
      );
    }

    const finalPet = (await client.query("SELECT * FROM pets WHERE id = $1", [id])).rows[0];
    const matchResult = await client.query(
      `SELECT id, finishes_at
       FROM ranked_matches
       WHERE pet_id = $1 AND result IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    );
    const pendingMatch = matchResult.rows[0] ?? null;

    await client.query("COMMIT");
    return { pet: finalPet, offlineReport, pendingMatch };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  try {
    const result = await loadPet(id);
    if (!result.pet) return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o pet" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim().slice(0, 32);
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const { rows } = await db.query(
    "INSERT INTO pets (name,species,color) VALUES ($1,$2,$3) RETURNING *",
    [name, String(body.species ?? "blob"), String(body.color ?? "green")]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
