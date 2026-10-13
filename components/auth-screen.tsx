"use client";
import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { passwordStrength, type Profile } from "@/lib/finance";
import { api } from "@/lib/api";
import { Icon } from "./ui";
import { OrbitLogo, FluidSculpture, OrbitStar } from "./brand";

export function AuthScreen({
  onDemo,
  onSuccess,
  initial = "login",
}: {
  onDemo: () => void;
  onSuccess: (p: Profile) => void;
  initial?: "register" | "login";
}) {
  const [mode, setMode] = useState(initial),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const strength = passwordStrength(password),
    labels = ["Введите пароль", "Слабый", "Средний", "Хороший", "Надёжный"];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (mode === "register" && data.password !== data.confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ user: Profile }>(`/api/auth/${mode}`, "POST", data);
      onSuccess(r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function switchMode() {
    if (busy) return;
    const update = () => {
      setMode((current) => (current === "login" ? "register" : "login"));
      setError("");
      setPassword("");
      setShow(false);
    };
    if (
      document.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      document.startViewTransition(() => flushSync(update));
    } else {
      update();
    }
  }
  return (
    <main className={`auth-page ${mode === "register" ? "is-register" : ""}`}>
      <div className="ambient-scene" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className="auth-top">
        <OrbitLogo />
        <span>ЛИЧНЫЕ ФИНАНСЫ, НОВАЯ ФОРМА</span>
        <button className="text-button" onClick={onDemo}>
          Посмотреть демо <Icon name="arrow-up-right" size={16} />
        </button>
      </header>
      <section
        className="auth-shell"
        aria-label={mode === "login" ? "Вход в ORBIT" : "Регистрация в ORBIT"}
      >
        <div className="auth-content">
          <div className="auth-form-heading">
            <span className="eyebrow">ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО</span>
            <h1>
              {mode === "login" ? (
                <>
                  С возвращением
                  <span className="auth-title-star">
                    <OrbitStar size={35} />
                  </span>
                </>
              ) : (
                "Начните свою орбиту"
              )}
            </h1>
            <p>
              {mode === "login"
                ? "Планы меняются. Контроль остаётся с вами."
                : "Один аккаунт. Ясная картина ваших финансов."}
            </p>
          </div>
          <div className="auth-tabs" aria-label="Вход или регистрация">
            <button
              aria-pressed={mode === "login"}
              disabled={busy}
              onClick={() => {
                if (mode !== "login") switchMode();
              }}
            >
              Вход
            </button>
            <button
              aria-pressed={mode === "register"}
              disabled={busy}
              onClick={() => {
                if (mode !== "register") switchMode();
              }}
            >
              Регистрация
            </button>
          </div>
          <form
            key={mode}
            onSubmit={submit}
            className="form-stack auth-form"
            aria-busy={busy}
          >
            {mode === "register" && (
              <label>
                Имя
                <input
                  name="fullName"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Алексей"
                  autoComplete="given-name"
                />
              </label>
            )}
            <label>
              Электронная почта
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label>
              Пароль
              <span className="password-field">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  placeholder="Не менее 8 символов"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                >
                  <Icon name={show ? "eye-off" : "eye"} />
                </button>
              </span>
            </label>
            {mode === "register" && (
              <>
                <div className={`strength strength-${strength}`}>
                  <div
                    role="progressbar"
                    aria-label="Надёжность пароля"
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-valuenow={strength}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <i key={n} className={n <= strength ? "filled" : ""} />
                    ))}
                  </div>
                  <span>{labels[strength]}</span>
                </div>
                <label>
                  Повторите пароль
                  <input
                    name="confirm"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="Повторите пароль"
                  />
                </label>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="liquid-button" disabled={busy} type="submit">
              <span>
                {busy
                  ? "Подождите…"
                  : mode === "login"
                    ? "Войти в ORBIT"
                    : "Создать аккаунт"}
                <Icon name="arrow-up-right" size={20} />
              </span>
              <i className="liquid-fill" aria-hidden="true" />
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? "Ещё нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button onClick={switchMode} disabled={busy}>
              {mode === "login" ? "Создать аккаунт" : "Войти"}
            </button>
          </p>
          <div className="auth-assurance">
            <Icon name="shield" size={16} />
            <span>Ваши записи доступны только вам</span>
          </div>
        </div>
        <aside className="auth-art" aria-label="ORBIT — финансы в вашем ритме">
          <div className="art-grid" />
          <span className="art-caption">МЕНЬШЕ ШУМА. БОЛЬШЕ ЯСНОСТИ.</span>
          <div className="art-glow" />
          <FluidSculpture />
          <div className="prism-glass">
            <OrbitStar size={34} />
            <span>
              Всё складывается.
              <br />
              <strong>В вашу пользу.</strong>
            </span>
            <Icon name="arrow-up-right" size={22} />
          </div>
        </aside>
      </section>
      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} ORBIT</span>
        <span>В вашем ритме. На вашей орбите.</span>
      </footer>
    </main>
  );
}
