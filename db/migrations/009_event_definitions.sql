CREATE TABLE IF NOT EXISTS event_definitions (
  id TEXT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  rarity VARCHAR(16) NOT NULL DEFAULT 'common',
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO event_definitions(id,title,description,rarity,rewards) VALUES
('snack-keyboard','Lanchinho no teclado','Seu pet achou uma moeda e um biscoito perto do setup.','common','{"coins":8,"stamina":4}'::jsonb),
('old-replay','Replay inesperado','Uma jogada antiga apareceu no histórico e virou uma mini sessão de estudo.','common','{"xp":18}'::jsonb),
('forgotten-box','Caixa esquecida','Atrás do monitor havia uma pequena caixa que ninguém lembrava de ter visto.','rare','{"coins":35,"xp":45}'::jsonb),
('dream-queue','Fila dos sonhos','Seu pet encontrou um parceiro de treino particularmente paciente.','rare','{"xp":70,"coins":20}'::jsonb),
('rift-signal','Sinal do Rift','As luzes do setup piscaram e o pet jurou ter recebido um sinal do Rift.','special','{"xp":120,"coins":50}'::jsonb),
('mystery-drop','Drop misterioso','Uma cápsula estranha apareceu no quarto. O que será que tem dentro?','special','{"coins":80,"xp":90}'::jsonb)
ON CONFLICT (id) DO NOTHING;
