import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function authorized(request: Request) {
  const key = process.env.HU3_ADMIN_KEY;
  return Boolean(key && request.headers.get("x-hu3-admin-key") === key);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.rank_tier, p.rank_division, p.lp, p.xp, p.coins,
            p.stamina, p.stress, p.luck, p.created_at, p.updated_at,
            COUNT(pi.id)::int AS item_count
     FROM pets p LEFT JOIN pet_items pi ON pi.pet_id = p.id
     GROUP BY p.id ORDER BY p.created_at DESC LIMIT 100`
  );
  return NextResponse.json(rows);
}
