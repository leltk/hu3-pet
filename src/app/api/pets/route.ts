import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const { rows } = await db.query("SELECT * FROM pets WHERE id = $1", [id]);
  if (!rows[0]) return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
  return NextResponse.json(rows[0]);
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
