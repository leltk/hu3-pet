import type { PoolClient } from "pg";

export type MissionTrigger = "training"|"stat_gain"|"ranked"|"ranked_win"|"item_use";

function periodKey(period: string, now = new Date()) {
  if (period === "weekly") {
    const d = new Date(now);
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - day);
    return `${d.toISOString().slice(0,10)}:week`;
  }
  return now.toISOString().slice(0,10);
}

export async function progressMissions(
  client: PoolClient,
  petId: string,
  trigger: MissionTrigger,
  amount = 1
) {
  const defs = await client.query(
    "SELECT * FROM mission_definitions WHERE active=TRUE AND trigger=$1",
    [trigger]
  );

  for (const mission of defs.rows) {
    const key = periodKey(mission.period);
    await client.query(
      `INSERT INTO pet_missions(pet_id,mission_id,period_key)
       VALUES($1,$2,$3)
       ON CONFLICT(pet_id,mission_id,period_key) DO NOTHING`,
      [petId, mission.id, key]
    );
    await client.query(
      `UPDATE pet_missions
       SET progress=LEAST(pet_missions.progress+$4,target),
           completed_at=CASE WHEN LEAST(pet_missions.progress+$4,target)>=target AND completed_at IS NULL THEN NOW() ELSE completed_at END
       FROM mission_definitions m
       WHERE pet_missions.pet_id=$1
         AND pet_missions.mission_id=m.id
         AND pet_missions.mission_id=$2
         AND pet_missions.period_key=$3
         AND pet_missions.claimed=FALSE`,
      [petId, mission.id, key, amount]
    );
  }
}

export function getPeriodKey(period: string) {
  return periodKey(period);
}
