import { createClient, type Client, type InValue } from "@libsql/client";

// The subset of the D1 interface used by ORBIT, backed by remote libSQL.
// Bound parameters and transactional batch semantics are preserved.
export function createDatabase(client: Client) {
  function prepare(sql: string, args: InValue[] = []) {
    return {
      sql,
      args,
      bind(...values: InValue[]) {
        return prepare(sql, values);
      },
      async first<T = Record<string, unknown>>() {
        const result = await client.execute({ sql, args });
        return result.rows.length
          ? (Object.fromEntries(Object.entries(result.rows[0])) as T)
          : null;
      },
      async all() {
        const result = await client.execute({ sql, args });
        return {
          results: result.rows.map((row) =>
            Object.fromEntries(Object.entries(row)),
          ),
        };
      },
      async run() {
        const result = await client.execute({ sql, args });
        return { success: true, meta: { changes: result.rowsAffected } };
      },
    };
  }
  return {
    prepare,
    batch(statements: Array<{ sql: string; args: InValue[] }>) {
      return client.batch(
        statements.map(({ sql, args }) => ({ sql, args })),
        "write",
      );
    },
  };
}

let database: ReturnType<typeof createDatabase> | undefined;
export const env = {
  get DB() {
    if (!database) {
      const url = process.env.TURSO_DATABASE_URL;
      const authToken = process.env.TURSO_AUTH_TOKEN;
      if (!url) throw new Error("TURSO_DATABASE_URL is required");
      if (process.env.RENDER && (!url.startsWith("libsql://") || !authToken)) {
        throw new Error(
          "Render requires a remote Turso database and auth token",
        );
      }
      database = createDatabase(createClient({ url, authToken }));
    }
    return database;
  },
};
