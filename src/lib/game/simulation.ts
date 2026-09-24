export type PetStats = {
  cs:number; positioning:number; skillshots:number; dodge:number; combat:number; mechanics:number;
  vision:number; objectives:number; rotations:number; wave_control:number; decision_making:number;
  stamina:number; stress:number; luck:number; rankIndex:number;
};

const DIFFICULTY=[24,30,36,43,50,58,67,76,86,96];

export function simulateRanked(stats:PetStats){
  const difficulty=DIFFICULTY[Math.min(9,Math.max(0,stats.rankIndex))];
  const micro=(stats.cs+stats.positioning+stats.skillshots+stats.dodge+stats.combat+stats.mechanics)/6;
  const macro=(stats.vision+stats.objectives+stats.rotations+stats.wave_control+stats.decision_making)/5;
  const condition=stats.stamina*0.12-stats.stress*0.10;
  const rankPressure=Math.max(0,(stats.rankIndex-1)*2.5);
  const power=micro*0.58+macro*0.42+condition-rankPressure;
  const variance=(Math.random()*34-17)+(stats.luck-50)*0.22;
  const score=power+variance;
  const win=score>=difficulty;
  const events:string[]=[];
  const add=(text:string)=>events.push(text);

  if(stats.cs>=micro+8) add("💰 Farmou muito bem e saiu da rota com vantagem de ouro.");
  if(stats.positioning>=70) add("👟 Encontrou bons ângulos e quase não entregou espaço.");
  if(stats.skillshots>=70 && Math.random()>.35) add("✨ Acertou uma habilidade decisiva e abriu uma janela de vantagem.");
  if(stats.dodge>=70 && Math.random()>.35) add("🌀 Desviou de uma skillshot importante na hora certa.");
  if(stats.combat>=75) add("⚔️ Levou a melhor nas trocas e chegou forte às lutas.");
  if(stats.mechanics>=75) add("🎮 Executou uma jogada mecânica que virou o ritmo da partida.");
  if(stats.vision>=70 && Math.random()>.4) add("👁️ A visão revelou uma movimentação perigosa antes da emboscada.");
  if(stats.objectives>=70 && Math.random()>.4) add("🐉 Garantiu um objetivo importante enquanto o rival estava fora de posição.");
  if(stats.rotations>=70) add("🗺️ Rotacionou no tempo certo e criou pressão em outro lado do mapa.");
  if(stats.wave_control>=70) add("🌊 Controlou a wave e forçou o adversário a responder.");
  if(stats.decision_making>=75) add("🧠 Tomou uma decisão difícil e escolheu a jogada mais segura.");
  if(variance>11) add("🔥 Entrou no modo concentração.");
  if(variance<-11) add("💨 Tomou uma skillshot que parecia impossível.");
  if(stats.stress>70) add("😵 Tiltou depois de uma morte evitável.");
  if(stats.stamina<30) add("🪫 Chegou na teamfight final sem energia.");
  if(stats.luck>75 && variance>5) add("🍀 A sorte sorriu para o pequeno monstro.");
  if(stats.rankIndex>=5 && score<difficulty+4) add("🧠 O adversário começou a punir cada erro.");
  if(events.length===0) add(win?"⚔️ Partida equilibrada, mas seu pet encontrou uma brecha no momento certo.":"🛡️ O adversário fechou os espaços e seu pet não conseguiu encontrar a virada.");

  return {power,variance,score,difficulty,win,events,micro,macro};
}
