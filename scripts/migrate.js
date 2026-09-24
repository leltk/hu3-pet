const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationsDir = path.join(process.cwd(), "db", "migrations");

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _hu3_pet_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const already = await client.query(
        "SELECT 1 FROM _hu3_pet_migrations WHERE name = $1",
        [file]
      );

      if (already.rowCount) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO _hu3_pet_migrations (name) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[migration] applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[migration] failed", error);
  process.exit(1);
});
