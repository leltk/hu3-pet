ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE pet_activities
  ADD COLUMN IF NOT EXISTS message TEXT;

CREATE INDEX IF NOT EXISTS pets_last_active_idx
  ON pets(last_active_at);

CREATE INDEX IF NOT EXISTS pet_activities_created_idx
  ON pet_activities(pet_id, created_at DESC);
