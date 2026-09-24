export type PetStats = {
  micro: number;
  macro: number;
  stamina: number;
  stress: number;
  luck: number;
};

export function simulateRanked(stats: PetStats) {
  const condition = stats.stamina * 0.15 - stats.stress * 0.1;
  const power = stats.micro * 0.6 + stats.macro * 0.4 + condition;
  const variance = (Math.random() * 50 - 25) + (stats.luck - 50) * 0.15;
  const score = power + variance;

  const events: string[] = [];
  if (variance > 15) events.push("Entrou no modo concentração.");
  if (variance < -15) events.push("Tomou uma skillshot que parecia impossível.");
  if (stats.stress > 70) events.push("Tiltou depois de uma morte evitável.");
  if (stats.stamina < 30) events.push("Chegou na teamfight final sem energia.");

  return { power, variance, score, win: score >= 65, events };
}