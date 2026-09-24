export type ItemEffects = {
  training_xp_pct?: number;
  rare_event_chance?: number;
  first_activity_xp_pct?: number;
  activity_stamina?: number;
  critical_training_chance?: number;
  combat_xp_pct?: number;
  secondary_stat_chance?: number;
  training_cooldown_pct?: number;
  skillshots_xp_pct?: number;
  post_ranked_xp_pct?: number;
  special_event_chance?: number;
  stamina_restore?: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  slot: string | null;
  rarity: string;
  icon: string;
  effects: ItemEffects;
  visual: Record<string, string>;
  origin: string | null;
  tradable: boolean;
  limited: boolean;
  quantity: number;
  equippedSlot: string | null;
};

export const EQUIPMENT_SLOTS = [
  ['head','Cabeça','🎩'],
  ['body','Corpo','👕'],
  ['weapon','Arma','⚔️'],
  ['ring_1','Anel I','💍'],
  ['ring_2','Anel II','💍'],
  ['boots','Botas','👟'],
  ['accessory','Acessório','🎧'],
] as const;

export function aggregateEffects(items: InventoryItem[]) {
  return items.reduce((acc,item) => {
    if (!item.equippedSlot) return acc;
    for (const [key,value] of Object.entries(item.effects)) {
      if (typeof value !== 'number') continue;
      acc[key] = (acc[key] ?? 0) + value;
    }
    return acc;
  }, {} as Record<string,number>);
}