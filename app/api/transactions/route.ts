import { validateTransaction } from "@/lib/finance";
import { ApiError, body, db, json, route, user } from "@/lib/server";
export const GET = (request: Request) =>
  route(async () => {
    const current = await user(request);
    const rows = await db()
      .prepare(
        "SELECT id,type,amount,category,title,date,account FROM transactions WHERE user_id=? ORDER BY date DESC,created_at DESC",
      )
      .bind(current.id)
      .all();
    return json({ transactions: rows.results });
  });
export const POST = (request: Request) =>
  route(async () => {
    const current = await user(request),
      b = await body(request);
    let t;
    try {
      t = validateTransaction(b);
    } catch (e) {
      throw new ApiError((e as Error).message);
    }
    const id = crypto.randomUUID();
    await db()
      .prepare(
        "INSERT INTO transactions (id,user_id,type,amount,category,title,date,account,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        current.id,
        t.type,
        t.amount,
        t.category,
        t.title,
        t.date,
        t.account,
        Date.now(),
      )
      .run();
    return json({ transaction: { id, ...t } }, 201);
  });
