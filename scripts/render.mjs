import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const command = process.argv[2];
if (!["build", "start", "dev"].includes(command))
  throw new Error("Expected build, start or dev");
process.env.ORBIT_RUNTIME = "node";
if (command === "start") {
  if (!process.env.TURSO_DATABASE_URL)
    throw new Error("Set TURSO_DATABASE_URL before starting ORBIT");
  if (process.env.RENDER) {
    if (
      !process.env.TURSO_DATABASE_URL.startsWith("libsql://") ||
      !process.env.TURSO_AUTH_TOKEN
    ) {
      throw new Error(
        "Render requires remote Turso storage; local files are not persistent",
      );
    }
    process.env.VINEXT_TRUST_PROXY = "1";
    process.env.VINEXT_TRUSTED_HOSTS =
      process.env.RENDER_EXTERNAL_HOSTNAME || "";
  }
  const migration = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./migrate-turso.mjs", import.meta.url))],
    { stdio: "inherit" },
  );
  if (migration.status !== 0) process.exit(migration.status || 1);
}
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/vinext/dist/cli.js", import.meta.url),
    ),
    command,
    ...process.argv.slice(3),
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
