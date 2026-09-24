CREATE TABLE IF NOT EXISTS mission_definitions (
  id TEXT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  trigger VARCHAR(32) NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  period VARCHAR(16) NOT NULL DEFAULT 'daily',
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pet_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL REFERENCES mission_definitions(id) ON DELETE CASCADE,
  period_key VARCHAR(32) NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(pet_id, mission_id, period_key)
);

CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  event_type VARCHAR(32) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  rarity VARCHAR(16) NOT NULL DEFAULT 'common',
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pet_missions_pet_idx ON pet_missions(pet_id, period_key);
CREATE INDEX IF NOT EXISTS game_events_pet_idx ON game_events(pet_id, created_at DESC);

INSERT INTO mission_definitions(id,name,description,trigger,target,period,rewards) VALUES
('daily-training','Rotina de treino','Complete treinos para manter o pet afiado.','training',5,'daily','{"xp":60,"coins":20}'::jsonb),
('daily-stat','Especialista do dia','Melhore uma habilidade qualquer.','stat_gain',15,'daily','{"xp":90,"coins":30}'::jsonb),
('daily-ranked','Chamado da fila','Conclua uma partida ranqueada.','ranked',1,'daily','{"xp":100,"coins":35}'::jsonb),
('weekly-wins','Subindo de elo','Vença partidas ranqueadas durante a semana.','ranked_win',3,'weekly','{"xp":300,"coins":100,"item_id":"energy_cookie","item_quantity":2}'::jsonb),
('weekly-items','Colecionador','Use itens consumíveis durante a semana.','item_use',3,'weekly','{"xp":180,"coins":70}'::jsonb)
ON CONFLICT (id) DO NOTHING;
