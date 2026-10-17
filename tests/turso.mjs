import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { createDatabase } from "../lib/turso.ts";

const client = createClient({ url: ":memory:" });
const db = createDatabase(client);
try {
  await db
    .prepare(
      "CREATE TABLE example (id TEXT PRIMARY KEY, amount INTEGER NOT NULL)",
    )
    .run();
  assert.equal(
    (await db.prepare("INSERT INTO example VALUES (?,?)").bind("one", 1).run())
      .meta.changes,
    1,
  );
  assert.deepEqual(
    await db.prepare("SELECT * FROM example WHERE id=?").bind("one").first(),
    { id: "one", amount: 1 },
  );
  assert.equal(
    await db
      .prepare("SELECT * FROM example WHERE id=?")
      .bind("missing")
      .first(),
    null,
  );
  assert.equal(
    (
      await db
        .prepare("UPDATE example SET amount=? WHERE id=?")
        .bind(2, "missing")
        .run()
    ).meta.changes,
    0,
  );
  assert.deepEqual((await db.prepare("SELECT * FROM example").all()).results, [
    { id: "one", amount: 1 },
  ]);
  await assert.rejects(
    db.batch([
      db.prepare("INSERT INTO example VALUES (?,?)").bind("two", 2),
      db.prepare("INSERT INTO example VALUES (?,?)").bind("one", 3),
    ]),
  );
  assert.equal(
    await db.prepare("SELECT * FROM example WHERE id=?").bind("two").first(),
    null,
  );
  assert.equal(
    (await db.prepare("DELETE FROM example WHERE id=?").bind("one").run()).meta
      .changes,
    1,
  );
  console.log(
    "PASS Turso adapter: bound values, rows, changes, missing records and transactional rollback",
  );
} finally {
  client.close();
}
