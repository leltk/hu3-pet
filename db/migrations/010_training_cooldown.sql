ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS last_training_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pets_last_training_idx
  ON pets(last_training_at);
