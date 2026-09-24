ALTER TABLE ranked_matches
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS micro_score INTEGER,
  ADD COLUMN IF NOT EXISTS macro_score INTEGER,
  ADD COLUMN IF NOT EXISTS highlight TEXT;

CREATE INDEX IF NOT EXISTS ranked_matches_result_idx
  ON ranked_matches(pet_id, result, created_at DESC);
