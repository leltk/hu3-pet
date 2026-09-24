CREATE TABLE IF NOT EXISTS item_definitions (
  id TEXT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(32) NOT NULL,
  slot VARCHAR(32),
  rarity VARCHAR(16) NOT NULL DEFAULT 'common',
  icon VARCHAR(16) NOT NULL DEFAULT '📦',
  effects JSONB NOT NULL DEFAULT '{}'::jsonb,
  visual JSONB NOT NULL DEFAULT '{}'::jsonb,
  origin VARCHAR(64),
  tradable BOOLEAN NOT NULL DEFAULT TRUE,
  limited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES item_definitions(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, item_id)
);

CREATE TABLE IF NOT EXISTS pet_equipment (
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  slot VARCHAR(32) NOT NULL,
  item_id TEXT NOT NULL REFERENCES item_definitions(id) ON DELETE RESTRICT,
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pet_id, slot)
);

CREATE INDEX IF NOT EXISTS pet_items_pet_idx ON pet_items(pet_id);
CREATE INDEX IF NOT EXISTS pet_equipment_pet_idx ON pet_equipment(pet_id);

INSERT INTO item_definitions
(id,name,description,category,slot,rarity,icon,effects,visual,origin,tradable,limited)
VALUES
('rabadon','Chapéu do Mago','Um chapéu absurdo que deixa até treino básico com cara de highlight.','equipment','head','epic','🎩',
 '{"training_xp_pct":12,"rare_event_chance":5}'::jsonb,'{"head":"wizard_hat"}'::jsonb,'drop inicial',TRUE,FALSE),
('doran_ring','Anel de Doran','Pequeno, clássico e surpreendentemente útil para começar o dia.','equipment','ring_1','common','💍',
 '{"first_activity_xp_pct":5,"activity_stamina":2}'::jsonb,'{"ring":"doran"}'::jsonb,'drop inicial',TRUE,FALSE),
('infinity_edge','Lâmina do Infinito','Treinos muito bons podem virar críticos e render progresso extra.','equipment','weapon','legendary','⚔️',
 '{"critical_training_chance":8,"combat_xp_pct":10}'::jsonb,'{"weapon":"greatsword"}'::jsonb,'evento competitivo',TRUE,FALSE),
('runaan','Furacão de Runaan','Uma sessão pode acabar acertando dois alvos de treino.','equipment','accessory','epic','🏹',
 '{"secondary_stat_chance":7,"training_xp_pct":4}'::jsonb,'{"accessory":"wind_bow"}'::jsonb,'evento competitivo',TRUE,FALSE),
('void_staff','Cajado do Vazio','Concentração afiada para treinos de precisão.','equipment','accessory','rare','🪄',
 '{"skillshots_xp_pct":12,"critical_training_chance":4}'::jsonb,'{"accessory":"void_staff"}'::jsonb,'drop inicial',TRUE,FALSE),
('boots','Botas do Andarilho','Um pouco menos de tempo parado significa mais tempo treinando.','equipment','boots','common','👟',
 '{"training_cooldown_pct":10}'::jsonb,'{"boots":"runner"}'::jsonb,'drop inicial',TRUE,FALSE),
('t1_shirt','Camiseta Gamer','Uma camiseta de respeito para quem leva o setup a sério.','equipment','body','rare','👕',
 '{"post_ranked_xp_pct":8,"special_event_chance":4}'::jsonb,'{"body":"gamer_shirt"}'::jsonb,'evento da comunidade',TRUE,FALSE),
('energy_cookie','Biscoito de Energia','Recupera um pouco de energia quando usado.','consumable',NULL,'common','🍪',
 '{"stamina_restore":18}'::jsonb,'{}'::jsonb,'drop inicial',TRUE,FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pet_items (pet_id,item_id,quantity)
SELECT p.id, x.item_id, x.quantity
FROM pets p
CROSS JOIN (VALUES
  ('doran_ring',1),('boots',1),('energy_cookie',3),('rabadon',1)
) AS x(item_id,quantity)
WHERE NOT EXISTS (
  SELECT 1 FROM pet_items pi WHERE pi.pet_id=p.id
);