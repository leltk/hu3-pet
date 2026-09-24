export type PetStats = {
  micro: number;
  macro: number;
  stamina: number;
  stress: number;
  luck: number;
  rankIndex: number;
};

const DIFFICULTY=[24,30,36,43,50,58,67,76,86,96];

export function simulateRanked(stats:PetStats){
  const difficulty=DIFFICULTY[Math.min(9,Math.max(0,stats.rankIndex))];
  const condition=stats.stamina*0.12-stats.stress*0.10;
  const rankPressure=Math.max(0,(stats.rankIndex-1)*2.5);
  const power=stats.micro*0.58+stats.macro*0.42+condition-rankPressure;
  const variance=(Math.random()*34-17)+(stats.luck-50)*0.22;
  const score=power+variance;
  const win=score>=difficulty;
  const events:string[]=[];
  if(variance>11) events.push("🔥 Entrou no modo concentração.");
  if(variance<-11) events.push("💨 Tomou uma skillshot que parecia impossível.");
  if(stats.stress>70) events.push("😵 Tiltou depois de uma morte evitável.");
  if(stats.stamina<30) events.push("🪫 Chegou na teamfight final sem energia.");
  if(stats.luck>75 && variance>5) events.push("🍀 A sorte sorriu para o pequeno monstro.");
  if(stats.rankIndex>=5 && score<difficulty+4) events.push("🧠 O adversário começou a punir cada erro.");
  return {power,variance,score,difficulty,win,events};
}
