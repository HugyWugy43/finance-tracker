import { db, json, route } from "@/lib/server";

export const GET = () =>
  route(async () => {
    await db().prepare("SELECT 1 FROM users LIMIT 1").first();
    return json({ status: "ok" });
  });
