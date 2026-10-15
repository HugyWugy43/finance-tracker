import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { request } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = process.env.ORBIT_URL || "http://127.0.0.1:5173";
const client = await request.newContext({ baseURL });
const results = [];
async function check(name, run) {
  try {
    await run();
    results.push({ name, passed: true });
    console.log("PASS", name);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error("FAIL", name, error.message);
  }
}
const email = `adversarial_${randomUUID()}@example.test`;
const transaction = {
  type: "expense",
  amount: 101,
  title: "Adversarial regression",
  category: "food",
  date: "2024-02-29",
  account: "Основной счёт",
};
try {
  for (const origin of [
    "null",
    "not-a-url",
    "https://untrusted.example",
    baseURL.replace(/^http:/, "https:"),
  ]) {
    await check(`Reject foreign or opaque Origin: ${origin}`, async () => {
      const r = await client.post("/api/auth/logout", {
        data: {},
        headers: { Origin: origin },
      });
      assert.equal(r.status(), 403);
    });
  }
  for (const raw of ["{", "null", "[]", "42"]) {
    await check(`Malformed/non-object JSON returns 400: ${raw}`, async () => {
      const r = await client.post("/api/auth/login", {
        data: raw,
        headers: { "Content-Type": "application/json" },
      });
      assert.equal(r.status(), 400);
    });
  }
  await check("Body size is bounded", async () => {
    const r = await client.post("/api/auth/login", {
      data: { padding: "x".repeat(13000) },
    });
    assert.equal(r.status(), 413);
  });
  const registered = await client.post("/api/auth/register", {
    data: {
      fullName: "Проверка",
      email,
      password: `Orbit!${randomUUID()}`,
    },
  });
  assert.equal(registered.status(), 201, "Test account registration");
  for (const [field, values] of Object.entries({
    amount: [
      -1,
      0,
      0.1,
      "101",
      null,
      100000000000,
      Number.MAX_SAFE_INTEGER + 1,
    ],
    date: ["2025-02-29", "2024-13-01", "1899-12-31", "2099-01-01"],
    title: [" ", "x".repeat(101), {}],
    account: [["Основной счёт"], {}, "Несуществующий счёт"],
    category: ["salary", null],
    type: ["transfer", null],
  })) {
    for (const value of values) {
      await check(
        `Reject invalid ${field}: ${JSON.stringify(value)}`,
        async () => {
          const r = await client.post("/api/transactions", {
            data: { ...transaction, [field]: value },
          });
          const payload = await r.json();
          // Clean up even if a broken validator accepts the test record.
          if (payload.transaction?.id)
            await client.delete(`/api/transactions/${payload.transaction.id}`, {
              data: {},
            });
          assert.equal(r.status(), 400);
        },
      );
    }
  }
  await check("Rejected writes do not persist", async () => {
    assert.deepEqual(
      (await (await client.get("/api/transactions")).json()).transactions,
      [],
    );
  });
  await check(
    "One kopeck survives create, update, read and delete",
    async () => {
      const r = await client.post("/api/transactions", {
        data: { ...transaction, amount: 1 },
      });
      assert.equal(r.status(), 201);
      const { transaction: saved } = await r.json();
      try {
        const updated = await client.patch(`/api/transactions/${saved.id}`, {
          data: { ...transaction, amount: 2 },
        });
        assert.equal(updated.status(), 200);
        assert.equal(
          (await (await client.get("/api/transactions")).json()).transactions[0]
            .amount,
          2,
        );
        const invalid = await client.patch(`/api/transactions/${saved.id}`, {
          data: { ...transaction, amount: -1 },
        });
        assert.equal(invalid.status(), 400);
        assert.equal(
          (await (await client.get("/api/transactions")).json()).transactions[0]
            .amount,
          2,
        );
      } finally {
        assert.equal(
          (
            await client.delete(`/api/transactions/${saved.id}`, { data: {} })
          ).status(),
          200,
        );
      }
      assert.deepEqual(
        (await (await client.get("/api/transactions")).json()).transactions,
        [],
      );
    },
  );
  await check("Logout invalidates a copied session token", async () => {
    const cookies = (await client.storageState()).cookies;
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    assert.equal(
      (await client.post("/api/auth/logout", { data: {} })).status(),
      200,
    );
    assert.equal(
      (await client.get("/api/me", { headers: { Cookie: cookie } })).status(),
      401,
    );
  });
  await check(
    "Whitespace and case cannot bypass login attempt limit",
    async () => {
      // A fresh address isolates the counter from registration and other tests.
      const address = `limit_${randomUUID()}@example.test`;
      for (let i = 0; i < 10; i++) {
        assert.equal(
          (
            await client.post("/api/auth/login", {
              data: { email: address, password: "wrong" },
            })
          ).status(),
          401,
        );
      }
      for (const variant of [
        address,
        ` ${address}`,
        `${address} `,
        address.toUpperCase(),
      ]) {
        assert.equal(
          (
            await client.post("/api/auth/login", {
              data: { email: variant, password: "wrong" },
            })
          ).status(),
          429,
          "All spellings must share the same counter",
        );
      }
    },
  );
} finally {
  await client.dispose();
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/adversarial.json",
    JSON.stringify({ date: new Date().toISOString(), results }, null, 2),
  );
}
assert.equal(
  results.filter((r) => !r.passed).length,
  0,
  "Adversarial regressions failed",
);
console.log(`${results.length} adversarial checks passed`);
