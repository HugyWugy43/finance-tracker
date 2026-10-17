import { createClient } from "@libsql/client";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

if (!process.env.TURSO_DATABASE_URL)
  throw new Error("TURSO_DATABASE_URL is required");
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
try {
  await client.execute(
    "CREATE TABLE IF NOT EXISTS orbit_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)",
  );
  const dir = new URL("../drizzle/", import.meta.url);
  for (const name of (await readdir(dir))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(new URL(name, dir), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await client.execute({
      sql: "SELECT checksum FROM orbit_migrations WHERE name=?",
      args: [name],
    });
    if (applied.rows.length) {
      if (applied.rows[0].checksum !== checksum)
        throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    const statements = sql
      .split("--> statement-breakpoint")
      .map((sql) => sql.trim())
      .filter(Boolean);
    await client.batch(
      [
        ...statements.map((sql) => ({ sql, args: [] })),
        {
          sql: "INSERT INTO orbit_migrations (name,checksum) VALUES (?,?)",
          args: [name, checksum],
        },
      ],
      "write",
    );
    console.log(`Applied migration: ${name}`);
  }
  console.log("Database schema is ready");
} finally {
  client.close();
}
