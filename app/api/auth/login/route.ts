import {
  ApiError,
  body,
  db,
  equal,
  hashPassword,
  json,
  limitAuth,
  route,
  session,
} from "@/lib/server";
export const POST = (request: Request) =>
  route(async () => {
    const b = await body(request);
    if (
      typeof b.email !== "string" ||
      typeof b.password !== "string" ||
      b.email.length > 254 ||
      b.password.length > 128
    )
      throw new ApiError("Проверьте почту и пароль.");
    const key = await limitAuth(request, b.email);
    const row = await db()
      .prepare("SELECT * FROM users WHERE email=?")
      .bind(b.email.trim().toLowerCase())
      .first<{
        id: string;
        full_name: string;
        nickname: string;
        email: string;
        budget: number;
        password_hash: string;
        salt: string;
      }>();
    const hash = await hashPassword(
      b.password,
      row?.salt || "00000000000000000000000000000000",
    );
    if (!row || !equal(hash, row.password_hash))
      throw new ApiError("Неверная почта или пароль.", 401);
    await db().prepare("DELETE FROM auth_attempts WHERE key=?").bind(key).run();
    return json(
      {
        user: {
          id: row.id,
          fullName: row.full_name,
          nickname: row.nickname,
          email: row.email,
          budget: row.budget,
        },
      },
      200,
      { "Set-Cookie": await session(request, row.id) },
    );
  });
