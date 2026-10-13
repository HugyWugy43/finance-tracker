import { ApiError, body, db, json, route, user } from "@/lib/server";
export const PATCH = (request: Request) =>
  route(async () => {
    const current = await user(request),
      b = await body(request);
    if (
      !Number.isSafeInteger(b.budget) ||
      b.budget <= 0 ||
      b.budget > 99999999999
    )
      throw new ApiError("Укажите бюджет больше нуля.");
    await db()
      .prepare("UPDATE users SET budget=? WHERE id=?")
      .bind(b.budget, current.id)
      .run();
    return json({ budget: b.budget });
  });
