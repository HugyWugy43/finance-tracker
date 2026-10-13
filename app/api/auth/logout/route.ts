import { body, cookie, db, digest, json, route, tokenOf } from "@/lib/server";
export const POST = (request: Request) =>
  route(async () => {
    await body(request);
    const token = tokenOf(request);
    if (token)
      await db()
        .prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await digest(token))
        .run();
    return json({ ok: true }, 200, { "Set-Cookie": cookie(request, "", 0) });
  });
