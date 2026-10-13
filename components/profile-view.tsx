"use client";
import { useState, type FormEvent } from "react";
import type { Profile } from "@/lib/finance";
import { api } from "@/lib/api";
import { Icon } from "./ui";

export function GuestProfile({
  onRegister,
  onLogin,
}: {
  onRegister: () => void;
  onLogin: () => void;
}) {
  return (
    <section className="panel profile-guest">
      <img
        src="/images/chrome-orbit.jpg"
        width={256}
        height={256}
        decoding="async"
        alt="Хромированная звезда с орбитой"
      />
      <div>
        <div className="eyebrow">ВАША ЛИЧНАЯ ОРБИТА</div>
        <h2>У финансов появится свой дом.</h2>
        <p>
          Создайте аккаунт, чтобы сохранять операции, следить за расходами и
          возвращаться к своим планам.
        </p>
        <button className="button primary" onClick={onRegister}>
          Создать аккаунт
        </button>
        <button className="text-button" onClick={onLogin}>
          Уже есть аккаунт? Войти
        </button>
      </div>
    </section>
  );
}

export function ProfileView({
  profile,
  onSave,
  onLogout,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onLogout: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: Profile }>(
        "/api/me",
        "PATCH",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      onSave(data.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profile-grid">
      <section className="panel">
        <div className="profile-header">
          <span className="profile-avatar">{profile.fullName[0]}</span>
          <div>
            <h2>{profile.fullName}</h2>
            <span>@{profile.nickname}</span>
          </div>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <label>
            ФИО
            <input
              name="fullName"
              defaultValue={profile.fullName}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label>
            Никнейм
            <input
              name="nickname"
              defaultValue={profile.nickname}
              required
              pattern="[A-Za-z0-9_]{3,24}"
            />
          </label>
          <label>
            Электронная почта
            <input
              name="email"
              type="email"
              defaultValue={profile.email}
              required
              maxLength={254}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить изменения"}
          </button>
        </form>
      </section>
      <section className="panel profile-settings">
        <h2>Ваше пространство</h2>
        <p>Личный учёт доходов и расходов в рублях.</p>
        <div className="profile-info">
          <Icon name="shield" size={24} />
          <h3>Личное остаётся личным</h3>
          <p>
            Операции привязаны к вашему аккаунту. После выхода ваши данные
            сохранятся.
          </p>
        </div>
        <button className="button secondary" onClick={onLogout}>
          <Icon name="logout" size={18} />
          Выйти из аккаунта
        </button>
      </section>
    </div>
  );
}
