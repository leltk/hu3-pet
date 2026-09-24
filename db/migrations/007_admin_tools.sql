CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(64) NOT NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  item_id TEXT REFERENCES item_definitions(id) ON DELETE SET NULL,
  amount INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_pet_idx ON admin_audit_log(pet_id, created_at DESC);
