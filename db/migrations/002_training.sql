CREATE TABLE IF NOT EXISTS pet_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  activity VARCHAR(32) NOT NULL,
  stat VARCHAR(32),
  amount INTEGER NOT NULL DEFAULT 0,
  stamina_delta INTEGER NOT NULL DEFAULT 0,
  stress_delta INTEGER NOT NULL DEFAULT 0,
  coins_delta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pet_activities_pet_idx ON pet_activities(pet_id, created_at DESC);
