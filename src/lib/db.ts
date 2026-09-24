import { Pool } from "pg";

declare global {
  var hu3PetPool: Pool | undefined;
}

export const db = global.hu3PetPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10
});

if (process.env.NODE_ENV !== "production") {
  global.hu3PetPool = db;
}