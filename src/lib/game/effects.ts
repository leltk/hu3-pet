import type { InventoryItem } from "./inventory";

export const EFFECT_CATALOG = [
  {key:"training_xp_pct",name:"XP de treino",description:"Aumenta o XP recebido por qualquer treino.",unit:"percent",scope:"training"},
  {key:"critical_training_chance",name:"Chance de treino crítico",description:"Chance de transformar um treino em crítico.",unit:"percent",scope:"training"},
  {key:"secondary_stat_chance",name:"Chance de treino secundário",description:"Chance de melhorar uma segunda habilidade.",unit:"percent",scope:"training"},
  {key:"training_cooldown_pct",name:"Cooldown de treino",description:"Reduz o tempo entre treinos.",unit:"percent",scope:"training"},
  {key:"first_activity_xp_pct",name:"XP da primeira atividade",description:"Bônus na primeira atividade do dia.",unit:"percent",scope:"daily"},
  {key:"activity_stamina",name:"Stamina por atividade",description:"Stamina extra ao iniciar uma atividade.",unit:"number",scope:"training"},
  {key:"skillshots_xp_pct",name:"XP de Skillshots",description:"Bônus para treinos de Skillshots.",unit:"percent",scope:"stat"},
  {key:"combat_xp_pct",name:"XP de Combate",description:"Bônus para treinos de Combate.",unit:"percent",scope:"stat"},
  {key:"post_ranked_xp_pct",name:"XP pós-ranqueada",description:"Bônus após uma ranqueada.",unit:"percent",scope:"ranked"},
  {key:"rare_event_chance",name:"Chance de evento raro",description:"Aumenta eventos raros.",unit:"percent",scope:"events"},
  {key:"special_event_chance",name:"Chance de evento especial",description:"Aumenta eventos especiais.",unit:"percent",scope:"events"},
  {key:"stamina_restore",name:"Recuperação de stamina",description:"Quantidade restaurada por consumível.",unit:"number",scope:"consumable"}
] as const;

export function aggregateEffects(items: InventoryItem[]) {
  return items.reduce((acc,item) => {
    if (!item.equippedSlot) return acc;
    for (const [key,value] of Object.entries(item.effects)) {
      if (typeof value === "number") acc[key] = (acc[key] ?? 0) + value;
    }
    return acc;
  }, {} as Record<string,number>);
}