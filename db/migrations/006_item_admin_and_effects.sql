ALTER TABLE pets ADD COLUMN IF NOT EXISTS last_training_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS effect_definitions (
  key TEXT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(16) NOT NULL DEFAULT 'number',
  scope VARCHAR(32) NOT NULL DEFAULT 'progression'
);

INSERT INTO effect_definitions(key,name,description,unit,scope) VALUES
('training_xp_pct','XP de treino','Aumenta o XP recebido por qualquer treino.','percent','training'),
('critical_training_chance','Chance de treino crítico','Chance de transformar um treino em crítico e ganhar progresso extra.','percent','training'),
('secondary_stat_chance','Chance de treino secundário','Chance de melhorar uma segunda habilidade no mesmo treino.','percent','training'),
('training_cooldown_pct','Cooldown de treino','Reduz o tempo entre treinos.','percent','training'),
('first_activity_xp_pct','XP da primeira atividade','Bônus de XP na primeira atividade do dia.','percent','daily'),
('activity_stamina','Stamina por atividade','Stamina extra ao iniciar uma atividade.','number','training'),
('skillshots_xp_pct','XP de Skillshots','Aumenta o XP efetivo de treinos de Skillshots.','percent','stat'),
('combat_xp_pct','XP de Combate','Aumenta o XP efetivo de treinos de Combate.','percent','stat'),
('post_ranked_xp_pct','XP pós-ranqueada','Aumenta o XP recebido após partidas ranqueadas.','percent','ranked'),
('rare_event_chance','Chance de evento raro','Aumenta a chance de eventos especiais.','percent','events'),
('special_event_chance','Chance de evento especial','Aumenta a chance de eventos especiais da comunidade.','percent','events'),
('stamina_restore','Recuperação de stamina','Quantidade restaurada por consumível.','number','consumable')
ON CONFLICT (key) DO NOTHING;